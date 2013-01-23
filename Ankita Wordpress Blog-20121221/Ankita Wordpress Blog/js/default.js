// For an introduction to the Grid template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkID=232446
(function () {
    "use strict";

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var nav = WinJS.Navigation;
    WinJS.strictProcessing();

    app.addEventListener("activated", function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            WPApi.checkLocalStorageSchemaVersion();
            WinJS.UI.processAll();
        }
    });

    WinJS.Application.onsettings = function (e) {
        //Adding the About page
        e.detail.applicationCommands = {
            "help": { title: "Help", href: "/pages/about-flyout.html" }
        };

        //Adding the Privacy Policy
        var appCommands = e.detail.e.request.applicationCommands;
        var appCmdPrivacy = new Windows.UI.ApplicationSettings.SettingsCommand("privacy", "Privacy Policy", function () {
            window.open('http://ankitakulkarni.cu.cc/privacy/privacy.html');
        });
        appCommands.append(appCmdPrivacy);

        WinJS.UI.SettingsFlyout.populateSettings(e);
    };

    app.start();
})();
