(function () {
	"use strict";

	var appView = Windows.UI.ViewManagement.ApplicationView;
	var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
	var nav = WinJS.Navigation;
	var ui = WinJS.UI;
	var utils = WinJS.Utilities;

	function hideLoader(e) {
		var postsList = document.querySelector('.win-surface');
		if (postsList && !WinJS.Utilities.hasClass(postsList, 'hide') && WPApi.groupedList.length) {
		    WPApi.toggleLoader('hide');
		}
	}

    WinJS.UI.Pages.define("/pages/mainpage.html", {
        ready: function (element, options) {
            WinJS.UI.Animation.enterPage(document.querySelector('header'), { top: '0px', left: '200px' });
            var self = this;
            document.getElementsByClassName("pagetitle")[0].innerHTML = WPApi.options.appTitle;
            if (WPApi.options.appTitleImage) {
                document.getElementsByClassName("titleImage")[0].src = WPApi.options.appTitleImage;
                document.querySelector('header').className = 'showImage';
            }
          
            self.loadPosts(element, options);            
        },

        loadPosts: function (element, options) {
            var self = this;
            WPApi.newDataSource().then(function () {
                self.updateLayout(element, Windows.UI.ViewManagement.ApplicationView.value);

                document.getElementById('allposts-list').winControl.addEventListener('loadingstatechanged', hideLoader);
                WPApi.postsFetched = new Date();
                self.loadingComplete(element, options);
            }, function (e) {

                WPApi.toggleLoader('hide');
                self.loadingComplete(element, options);
            }, function (p) {
            });
        },

        loadingComplete: function (element, options) {
            document.getElementById("refresh").addEventListener("click", WPApi.refresh, false);            
            document.getElementById('allposts-list').winControl.addEventListener("mousewheel", function (eventObject) {
                var delta = -Math.round(eventObject.wheelDelta);
                document.getElementById('allposts-list').winControl.scrollPosition = document.getElementById('allposts-list').winControl.scrollPosition + delta;
            });
        },

        // This function updates the page layout in response to viewState changes.
        updateLayout: function (element, viewState) {
            if (false === WPApi.refreshFetch)
                WPApi.updateList();

            var listView = element.querySelector('#allposts-list').winControl;
            var listViewLayout ;
            
            if (viewState === Windows.UI.ViewManagement.ApplicationViewState.snapped) {
                listViewLayout = new WinJS.UI.ListLayout();
            } else {
                listViewLayout = new WinJS.UI.GridLayout();
            }

                
            WinJS.UI.setOptions(element.querySelector('#allposts-list').winControl, {
                itemDataSource: WPApi.groupedList.dataSource,
                itemTemplate: element.querySelector('#allpostsTemplate'),
                groupDataSource: WPApi.groupedList.groups.dataSource,
                groupHeaderTemplate: element.querySelector('#headerTemplate'),
                selectionMode: 'none',
                swipeBehavior: 'none',
                oniteminvoked: WPApi.showPost,
                layout: listViewLayout
            });
        },        
    });
})();
