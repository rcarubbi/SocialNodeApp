define(['router'], function (router) {
    var checkLogin = function (callback) {
            $.ajax("/account/authenticated", {
                method: "GET",
                success: function () {
                    return callback(true);
                },
                error: function (data) {
                    return callback(false);
                }
            });
        },
        runApplication = function (authenticated) {
            if (!authenticated) {
                window.location.hash = 'login';
            } else {
                window.location.hash = 'index';
            }
            Backbone.history.start();
        },
        initialize = function () {
            checkLogin(runApplication);
        };

    return {
        initialize: initialize
    };
});