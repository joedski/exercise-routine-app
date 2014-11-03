angular.module('starter.controllers', [])

.controller('DailyCtrl', function( $scope, DailyExercises, dropboxSync ) {
	$scope.isLoaded = false;
	$scope.isErrored = false;

	// blarbl this should probably be put somewhere else or
	// streamlined some how so it's not a preamble to every
	// top-level views.
	checkIfAccountIsLinked();

	function checkIfAccountIsLinked() {
		dropboxSync.checkLink().then( accountLinkedOrNot, errorCheckingLink );
	}

	function accountLinkedOrNot( isLinked ) {
		if( isLinked ) {
			DailyExercises.fetch().then( exercisesFetched, errorFetchingExercises );
		}
		else {
			tryToLinkAccount();
		}
	}

	function tryToLinkAccount() {
		dropboxSync.link().then( checkIfAccountIsLinkedWhenAccountChanges, errorAttemptingToInitiateLink );
	}

	function checkIfAccountIsLinkedWhenAccountChanges() {
		// potential memory leak?  What happens when we leave this view
		// but accountChange hasn't fired yet?
		// Nothing because Angular is awesome?  Who knows...
		dropboxSync.on( 'accountChange', function onAccountChange() {
			dropboxSync.off( 'accountChange', onAccountChange );
			checkIfAccountIsLinked();
		});
	}

	function exercisesFetched() {
		$scope.isErrored = false;
		$scope.isLoaded = true;
		$scope.dailyExercises = DailyExercises.all();
	}

	function errorHappened( error ) {
		$scope.isErrored = true;
		$scope.isLoaded = false;
		$scope.errorMessage = error.message;
	}

	function errorFetchingExercises( error ) {
		errorHappened( error );
	}

	function errorCheckingLink( error ) {
		errorHappened( error );
	}

	function errorAttemptingToInitiateLink( error ) {
		errorHappened( error );
	}
})

.controller('ExercisesCtrl', function( $scope, Exercises, dropboxSync ) {
	// Is this better managed by adding more states?
	// Or is that complication for complication's sake?
	// I guess I'll try it some time.
	$scope.isLoaded = false;
	$scope.isErrored = false;

	// blarbl this should probably be put somewhere else or
	// streamlined some how so it's not a preamble to every
	// top-level views.
	checkIfAccountIsLinked();

	function checkIfAccountIsLinked() {
		dropboxSync.checkLink().then( accountLinkedOrNot, errorCheckingLink );
	}

	function accountLinkedOrNot( isLinked ) {
		if( isLinked ) {
			Exercises.fetch().then( exercisesFetched, errorFetchingExercises );
		}
		else {
			tryToLinkAccount();
		}
	}

	function tryToLinkAccount() {
		dropboxSync.link().then( checkIfAccountIsLinkedWhenAccountChanges, errorAttemptingToInitiateLink );
	}

	function checkIfAccountIsLinkedWhenAccountChanges() {
		// potential memory leak?  What happens when we leave this view
		// but accountChange hasn't fired yet?
		// Nothing because Angular is awesome?  Who knows...
		dropboxSync.on( 'accountChange', function onAccountChange() {
			dropboxSync.off( 'accountChange', onAccountChange );
			checkIfAccountIsLinked();
		});
	}

	// Literally the only difference between Exercises (all) and DailyExercises...
	function exercisesFetched() {
		$scope.isErrored = false;
		$scope.isLoaded = true;
		$scope.exercises = Exercises.all();

		_( $scope.exercises ).each( function checkIfHasSettings( exercise ) {
			exercise.hasSettings = !! Object.keys( exercise.settings ).length;
		});
	}

	function errorHappened( error ) {
		$scope.isErrored = true;
		$scope.isLoaded = false;
		$scope.errorMessage = error.message;
	}

	function errorFetchingExercises( error ) {
		errorHappened( error );
	}

	function errorCheckingLink( error ) {
		errorHappened( error );
	}

	function errorAttemptingToInitiateLink( error ) {
		errorHappened( error );
	}
})

.controller('ExerciseDetailCtrl', function( $scope, $stateParams, Exercises ) {
	$scope.exercise = Exercises.get($stateParams.exerciseId);
})

.controller('DailyDetailCtrl', function( $scope, $stateParams, DailyExercises ) {
	$scope.exercise = DailyExercises.get($stateParams.exerciseId);
})

.controller('AccountCtrl', function( $scope ) {
});
