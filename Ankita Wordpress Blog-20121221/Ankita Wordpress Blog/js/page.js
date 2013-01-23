(function () {
    "use strict";

    var item;
    var start = Windows.UI.StartScreen;


    function ready(element, options) {
    	WinJS.UI.Animation.enterPage(document.querySelector('.fragment.post'), { top: '0px', left: '200px' });       

    	item = options.item; // needs to be a global

    	var lsPost = item;
        // Populate the page with Blog info
    	document.title = WPApi.decodeEntities(item.post_title);
    	document.querySelector('.post').setAttribute('id', item.post_id);
        document.querySelector('.title').innerText = item.post_title;

        WinJS.Utilities.setInnerHTMLUnsafe(document.querySelector('.content'), lsPost.content);

        document.querySelector('.meta').innerHTML += '<div class="meta-txt">Updated ' + WPApi.timeSince(item.post_date) + ' ago</div>';


        document.getElementById("home").addEventListener("click", function () { var nav = WinJS.Navigation; nav.back(nav.history.backStack.length); }, false);

        document.getElementById('viewblog').removeEventListener("click", viewBlog);
        document.getElementById('viewblog').addEventListener("click", viewBlog, false );

        document.querySelector('.contentArea').addEventListener("mousewheel", function (eventObject) {
            var delta = -Math.round(eventObject.wheelDelta);
            document.querySelector('.contentArea').scrollLeft += delta;
        });

        // Catch link clicks and iframe them.
        WPApi.iframePostLinks();
        
        return;
    }

    function GetDateDifference(LSPostDateString) {
        // Expected Format: 
        //  0123456789012345678
        //  2012-10-26 07:49:03
        var Year = LSPostDateString.substring(0, 4);
        var Month = parseInt(LSPostDateString.substring(5, 7)) - 1; // month starts from 0 to 11
        var Day = LSPostDateString.substring(8, 10);
        var Hour = LSPostDateString.substring(11, 13);
        var Minute = LSPostDateString.substring(14, 16);
        var Milli = LSPostDateString.substring(17);
        return WPApi.timeSince(new Date(Year, Month, Day, Hour, Minute, Milli, 0));
    }

    function viewBlog() {
        if (WinJS.Utilities.hasClass(document.querySelector("button#viewblog"), 'open-in-browser'))
            top.location.href = item.permalink;
        else
            WPApi.renderIframeView(item.permalink);
    }

    function updateLayout(element, viewState) {
        // TODO: Respond to changes in viewState.
        if (viewState == Windows.UI.ViewManagement.ApplicationViewState.snapped) {
            var backlink = document.getElementById("backlink");
            if (backlink) {
                backlink.click();
            }
        }
    }


    WinJS.UI.Pages.define("/pages/page.html", {
        ready: ready,
        updateLayout: updateLayout
	});
})();
