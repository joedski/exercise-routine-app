angular.module( 'starter.filters', [] )
	.filter( 'isEmpty', function() {
		return function isEmpty( object ) {
			return _.isEmpty( object );
		};
	});