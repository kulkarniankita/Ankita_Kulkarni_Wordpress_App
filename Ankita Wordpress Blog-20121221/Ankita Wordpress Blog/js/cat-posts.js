(function () {
	"use strict";

	var appView = Windows.UI.ViewManagement.ApplicationView;
	var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
	var nav = WinJS.Navigation;
	var ui = WinJS.UI;
	var utils = WinJS.Utilities;
	var item;

	function hideLoader(e) {
		var postsList = document.querySelector('.win-surface');
		if (postsList && !WinJS.Utilities.hasClass(postsList, 'hide') && item.list.length) {
		    WPApi.toggleLoader('hide');
		}
	}
	function getOlderPosts(e) {
	    if (document.getElementById('catposts-list')) {
	        var listview = document.getElementById('catposts-list').winControl;

	        if ('itemsLoaded' == listview.loadingState && (listview.indexOfLastVisible + 1 + (2 * WPApi.getDefaultPostCount())) >= item.list.length && !item.fetching) {
	            item.getData((item.list.length / WPApi.getDefaultPostCount()));
	        } else if ('complete' == listview.loadingState) {
	            item.scrollPosition = listview.scrollPosition;
	        }
	    }
	}

	function scrollToPosition(e) {
	    var listview = document.getElementById("catposts-list").winControl;
	    var pos = WPApi.categories[item.id].scrollPosition;

	    if ('complete' == listview.loadingState) {
	        WPApi.toggleElement(document.querySelector('.win-surface'), 'show');
	        if (pos > 0)
	            listview.scrollPosition = pos;
	        listview.removeEventListener('loadingstatechanged', scrollToPosition);
	    }
	}


    WinJS.UI.Pages.define("/pages/cat-posts.html", {
        ready: function (element, options) {
            item = options.cat;
            WinJS.UI.Animation.enterPage(document.querySelector('header'), { top: '0px', left: '200px' });

            
            document.querySelector('.pagetitle').innerText = item.title;

            this.updateLayout(element, Windows.UI.ViewManagement.ApplicationView.value);

            document.getElementById('catposts-list').winControl.addEventListener('loadingstatechanged', hideLoader);

            document.getElementById('catposts-list').winControl.addEventListener("mousewheel", function (eventObject) {
                var delta = -Math.round(eventObject.wheelDelta);
                document.getElementById('catposts-list').winControl.scrollPosition = document.getElementById('catposts-list').winControl.scrollPosition + delta;
            });            
        },

        // This function updates the page layout in response to viewState changes.
        updateLayout: function (element, viewState) {
            var listView = element.querySelector('#catposts-list').winControl;
            var listViewLayout, zoomoutViewLayout;
            
            if (viewState === Windows.UI.ViewManagement.ApplicationViewState.snapped) {
                listViewLayout = new WinJS.UI.ListLayout();
            } else {
                listViewLayout = new WinJS.UI.GridLayout();
            }


            var self = this;
            WinJS.UI.setOptions(element.querySelector('#catposts-list').winControl, {
                itemDataSource: item.list.dataSource,
                itemTemplate: element.querySelector('#catpostsTemplate'),
                selectionMode: 'none',
                swipeBehavior: 'none',
                oniteminvoked: self.showPost,
                layout: listViewLayout
            });
            if (item.scrollPosition > 0) {
                WPApi.toggleElement(document.querySelector('.win-surface'), 'hide');
                listView.addEventListener('loadingstatechanged', scrollToPosition);
            }

            listView.addEventListener('loadingstatechanged', getOlderPosts);

        },

        showPost: function (eventObject) {
            var i = item.list.getAt(eventObject.detail.itemIndex);

            WinJS.Navigation.navigate("/pages/post.html", { item: i });
        },
    });
})();
