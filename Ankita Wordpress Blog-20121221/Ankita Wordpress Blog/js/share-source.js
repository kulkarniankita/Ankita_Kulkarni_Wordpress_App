(function () {
    function initializeShareSource() {
        setupShare();
        // we'd bind a share button's click to showShareUI() here
    }

    function setupShare() {
        var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
        dataTransferManager.addEventListener("datarequested", function (e) {
            var request = e.request;
            uriDataRequestedHandler(request);
        });
    }

    function showShareUI() {
        // if we ever want a share button, just assign this onlick
        Windows.ApplicationModel.DataTransfer.DataTransferManager.showShareUI();
    }

    function uriDataRequestedHandler(request) {
        var postEl = document.querySelector('.post');
        if (null != postEl && WinJS.Utilities.hasClass(postEl, 'fragment')) {
            // we're in single post view
            var post_key = postEl.getAttribute('id');
            if (null == post_key)
                return; // can't find a post key

            var lsPost = WPApi.getPost(post_key);
            if (null == lsPost)
                return; // can't find the matching localStorage post for extra props
            request.data.setUri(new Windows.Foundation.Uri(lsPost.permalink));
            request.data.properties.title = postEl.querySelector('.title').innerText;
            request.data.properties.description = postEl.querySelector('.content').innerText.substring(0, 50);
        } else {
            // we're not in a single post view, let's promote your site
            request.data.setUri(new Windows.Foundation.Uri(WPApi.apiURL));
            request.data.properties.title = WPApi.options.appTitle;
            request.data.properties.description = WPApi.options.appTitle;
        }
    }

    document.addEventListener("DOMContentLoaded", initializeShareSource, false);
})();