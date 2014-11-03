angular.module('starter.services', [ 'starter.services.random' ])

// TODO: Add ability to store locally?
// Actually, I think Dropbox will handle that automatically...
// TODO: Actually observe file for changes so that updates are reflected without rebooting the app.
.factory( 'Exercises', function( $q, dropboxSync ) {
  var exerciseData, exerciseTable, exerciseFilePath;

  exerciseFilePath = 'exercises.json';

  return {
    // I should probably find a better way to do this than checking fetch every time...
    fetch: function( options ) {
      var deferred, promise;

      options = options || {};
      deferred = $q.defer();
      promise = deferred.promise;

      // Check link.
      // If linked, fetch data and resolve with
      //   (resolve if data already gotten.)
      // If not linked, reject noting account is not linked.
      dropboxSync.checkLink()
      .then( fetchIfLinked, errorCheckingLink );

      function fetchIfLinked( isLinked ) {
        if( isLinked ) {
          if( ! exerciseTable || options.force ) {
            dropboxSync.readString( exerciseFilePath )
            .then( parseTableAndResolve, deferred.reject );
          }
          else {
            resolveWithTable();
          }
        }
        else {
          deferred.reject({ message: "No account linked." });
        }
      }

      function parseTableAndResolve( tableString ) {
        try {
          exerciseData = JSON.parse( tableString );
          exerciseTable = exerciseData.exercises;
          resolveWithTable();
        }
        catch( error ) {
          rejectWithErrorParsingTable( error );
        }
      }

      function resolveWithTable() {
        deferred.resolve( exerciseTable );
      }

      function rejectWithErrorParsingTable( error ) {
        deferred.reject({ message: "Could not parse received table.", error: error });
      }

      function errorCheckingLink( error ) {
        deferred.reject({ message: "Mysterious error checking if account is linked.", error: error });
      }

      return promise;
    },
    refresh: function( options ) {
      options = _.defaults({
        force: true
      }, options );
      return this.fetch( options );
    },
    all: function() {
      return exerciseTable;
    },
    get: function( id ) {
      return _.findWhere( exerciseTable, { id: id });
    },
    find: function( fn ) {
      return _.find( exerciseTable, fn );
    },
    where: function( queryAttributes ) {
      return _.where( exerciseTable, queryAttributes );
    }
  }
})

.factory( 'DailyExercises', function( $q, Exercises, MersenneTwister ) {
  // TODO: Rewrite so that this generates a list so the current exercise can be rerolled in case the machine is occupied.
  var currentDailyExercisestable, nextDailyExercisesTable, dailyCategories, allExercises;
  var rng;

  function seededSample( collection ) {
    var
      value = rng.random(),
      index = Math.floor( value * collection.length );

    return collection[ index ];
  }

  function resetSeed() {
    var
      today = new Date( Date.now() ),
      todayNumber = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    // rng.seed( todayNumber );
    rng = MersenneTwister.newWithSeed( todayNumber + 1 );
  }

  resetSeed();

  // allExercises = Exercises.all();

  currentDailyExercisestable = currentDailyExercisestable || [];

  dailyCategories = [ 'legs', 'shoulders', 'back', 'chest', 'abdominals' ];

  function rollDailies() {
    // With this, rollDailies wil always roll the same list on a given day.  (so don't depend on this list around midnight.)
    resetSeed();

    nextDailyExercisesTable = _.map( dailyCategories, function rollCategory( categoryName, index ) {
      // get exercises in category
      // reject category that was daily in category previously, if there is one.
      // select one at random to be new daily.

      var currentExercisesInCategory = _.where( allExercises, { categories: [ categoryName ] });
      var previousExercise = _.findWhere( currentDailyExercisestable, { category: [ categoryName ] });
      var nextExerciseInCategory;

      if( previousExercise ) {
        currentExercisesInCategory = _.reject( currentExercisesInCategory, function isPreviousExercise( exercise ) {
          return exercise.name == previousExercise.name;
        });
      }

      // Edge case: What if we only have 1 exercise in a given category?

      nextExerciseInCategory = _.clone( seededSample( currentExercisesInCategory ) );

      _.extend( nextExerciseInCategory, {
        id: String( index ),
        completed: false
      });

      return nextExerciseInCategory;
    });

    return nextDailyExercisesTable;
  }

  // currentDailyExercisestable = rollDailies();

  return {
    fetch: function( options ) {
      var promise;

      if( options.force ) {
        currentDailyExercisestable = null;
      }

      promise = Exercises.fetch( options );
      promise.then(
        function success() {
          if( ! currentDailyExercisestable ) {
            currentDailyExercisestable = rollDailies();
            allExercises = Exercises.all();
          }
        },
        function failure( error ) {
          console.log( 'Error rerolling dailies:', error.message );
          if( error.error ) console.log( 'Error object;', error.error );
        }
      );

      return promise;
    },

    refresh: function( options ) {
      options = _.defaults({
        force: true
      }, options );
      // ...
      return this.fetch( options );
    },

    all: function() {
      return currentDailyExercisestable;
    },

    get: function( id ) {
      return _.findWhere( currentDailyExercisestable, { id: id });
    },

    roll: function() {
      currentDailyExercisestable = rollDailies();
      return currentDailyExercisestable;
    }
  };
})

.factory( 'dropboxSync', function( $q ) {
  var prop;
  var dropboxSync = window.dropbox.sync;
  var ngDropboxSync = {};
  var slice = [].slice;

  function wrapDropboxCall( originalCall ) {
    var __ocName = String( originalCall ).replace( /\n.*$/gm, '' ) + '...';

    return function wrappedCall() {
      var deferred = $q.defer();
      var args = slice.call( arguments, 0 );

      console.log( 'wrapDropboxCall: call to', __ocName );

      args.push( function promiseCallback( error, result ) {
        if( error ) {
          console.log( 'wrapDropboxCall: error returned by ', __ocName, ':' );
          console.log( error );
          deferred.reject( error );
        }
        else {
          console.log( 'wrapDropboxCall: success returned by ', __ocName, result ? ':' : '(empty result)' );
          if( result )
            console.log( 'result =', result );
          // result may be nothing.
          deferred.resolve( result );
        }
      });

      originalCall.apply( null, args );

      return deferred.promise;
    };
  }

  // Handle the event things first because they don't need to be wrapped.
  // Note: ngDropboxSync does NOT get separate callbacks from dropbox.sync.
  // That is to say, they both have the exact same list of callbacks.
  // Calling dropboxSync.on( 'someEvent', cb ) will result in window.dropbox.sync.trigger( 'someEvent' )
  // calling cb.
  ngDropboxSync.trigger = dropboxSync.trigger;
  ngDropboxSync.off = dropboxSync.off;
  ngDropboxSync.on = dropboxSync.on;

  for( prop in dropboxSync ) {
    if( ! dropboxSync.hasOwnProperty( prop ) ) continue;

    if( ! ngDropboxSync[ prop ] )
      ngDropboxSync[ prop ] = wrapDropboxCall( dropboxSync[ prop ] );
  }

  return ngDropboxSync;
});
