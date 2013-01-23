(function () {
    "use strict";

    var item;

    function ready(element, options) {
        WinJS.UI.Animation.enterPage(document.querySelector('.fragment.post'), { top: '0px', left: '200px' });

        item = options.item; // needs to be a global

        var lsPost = item;
        // Populate the Comment buttons events
        document.getElementById("commentButton").addEventListener("click", showCommentFlyout, false);
        document.getElementById("submitCommentButton").addEventListener("click", submitComment, false);
        document.getElementById("commentFlyout").addEventListener("afterhide", onDismiss, false);

        // Populate the page with Blog info
        document.title = WPApi.decodeEntities(item.post_title);
        document.querySelector('.post').setAttribute('id', item.post_id);
        document.querySelector('.title').innerText = item.post_title;

        WinJS.Utilities.setInnerHTMLUnsafe(document.querySelector('.content'), lsPost.content);

        document.querySelector('.meta').innerHTML += '<div class="meta-txt"><em>by ' + item.author_name + '</em><br />Posted ' + WPApi.timeSince(item.post_date) + ' ago</div>';


        document.getElementById("like").addEventListener("click", bookmarkClick, false);
        document.getElementById("home").addEventListener("click", function () { var nav = WinJS.Navigation; nav.back(nav.history.backStack.length); }, false);

        //document.getElementById('viewblog').removeEventListener("click", viewBlog);
        //document.getElementById('viewblog').addEventListener("click", viewBlog, false);

        document.querySelector('.contentArea').addEventListener("mousewheel", function (eventObject) {
            var delta = -Math.round(eventObject.wheelDelta);
            document.querySelector('.contentArea').scrollLeft += delta;
        });

        // Catch link clicks and iframe them.
        WPApi.iframePostLinks();

        // TODO: refactor Comments and Related post into templates
        // Comments
        // Loop through all comments
        var comments = '';
        for (var i = 0; i < lsPost.comments.length; i++) {
            comments += '<div class="item"><div class="wp-caption-text">';
            comments += lsPost.comments[i].content + '</div>';
            comments += '<p style="float:right;">Posted by ' + lsPost.comments[i].name + ' ';
            comments += GetDateDifference(lsPost.comments[i].date) + ' ago</p></div>';
        }
        WinJS.Utilities.setInnerHTMLUnsafe(document.querySelector('.comment'), comments);

        // Related Post
        var relatedPost = '';
        var primary_cat_id = item.primary_cat.id;
        var prim_cat = WPApi.categories[primary_cat_id];
        var count = 0;
        for (var l = 0; l < prim_cat.list.length && l < WPApi.options.numberOfRelatedPosts; l++) {
            // Only add post that is not itself.
            var value = prim_cat.list.getAt(l);
            if (value.post_id != item.post_id) {
                relatedPost += '<div class="item"><div class="wp-caption-text" id="related' + value.post_id + '"><a href="#">' + value.post_title + '</a></div><br/>';
                relatedPost += '<p style="float:right;">From ' + value.author_name + ' ' + GetDateDifference(value.post_date) + ' ago</p></div>';
            }
        }

        WinJS.Utilities.setInnerHTMLUnsafe(document.querySelector(".relatedPost"), relatedPost)

        // We'll add the listener after we add the elements into the script
        prim_cat.list.forEach(
             function showIteration(value, index, array) {
                 if (value.post_id != item.post_id) {
                     if (document.getElementById('related' + value.post_id)) {
                         document.getElementById('related' + value.post_id).addEventListener("click", function () {
                             WinJS.Navigation.navigate("/pages/post.html", { item: value });
                         }, false);
                     }
                 }
             }
        );

        // Make sure the bookmark icon is properly updated.
        updateButton(WPApi.checkIsBookmarked(item.post_id));

        return; // convenient to set breakpoint :)
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

   /* function viewBlog() {
        if (WinJS.Utilities.hasClass(document.querySelector("button#viewblog"), 'open-in-browser'))
            top.location.href = item.permalink;
        else
            WPApi.renderIframeView(item.permalink);
    }
    */
    function updateLayout(element, viewState) {
        if (viewState == Windows.UI.ViewManagement.ApplicationViewState.snapped) {
            var backlink = document.getElementById("backlink");
            if (backlink) {
                backlink.click();
            }
        }
    }

    // Update the behavior of the app button
    function updateButton(IsBookmarked) {
        var likeButton = document.getElementById('like');

        if (!IsBookmarked) {
            WinJS.Utilities.removeClass(likeButton, "selected");
            likeButton.onmouseover = "";
            likeButton.onmouseout = "";

            likeButton.getElementsByClassName('win-label').item(0).innerText = "Bookmark";
        }
        else {
            likeButton.getElementsByClassName('win-label').item(0).innerText = "Bookmarked";
            WinJS.Utilities.addClass(likeButton, "selected");
            likeButton.onmouseover = function () {
                likeButton.getElementsByClassName('win-label').item(0).innerText = "Unbookmark";
            }
            likeButton.onmouseout = function () {
                likeButton.getElementsByClassName('win-label').item(0).innerText = "Bookmarked";
            }
        }
    }

    function bookmarkClick(m) {
        var isBookmarked = WPApi.checkIsBookmarked(item.post_id);
        if (!isBookmarked) {
            WPApi.addToBookmark(item);
            updateButton(true);
        }
        else {
            WPApi.removeFromBookmark(item.post_id);
            updateButton(false);
        }
    }

    // Show the flyout
    function showCommentFlyout() {
        //loggedIn = false;
        //WinJS.log && WinJS.log("", "sample", "status", "status");

        var commentButton = document.getElementById("commentButton");
        document.getElementById("commentFlyout").winControl.show(commentButton);
        // Clear the results text
        document.getElementById('comments#results').innerText = "";
    }

    // Show errors if any of the text fields are not filled out when the Comment button is clicked
    function submitComment() {
        var error = false;
        if (document.getElementById("commentName").value.trim() === "") {
            document.getElementById("commentNameError").innerHTML = "Name is required";
            document.getElementById("commentName").focus();
            error = true;
        } else {
            document.getElementById("commentNameError").innerHTML = "";
        }
        if (document.getElementById("commentEmail").value.trim() === "") {
            document.getElementById("commentEmailError").innerHTML = "Email is required";
            document.getElementById("commentEmail").focus();
            error = true;
        } else {
            document.getElementById("commentEmailError").innerHTML = "";
        }
        if (document.getElementById("commentComment").value.trim() === "") {
            document.getElementById("commentCommentError").innerHTML = "Comment is required";
            document.getElementById("commentComment").focus();
            error = true;
        } else {
            document.getElementById("commentCommentError").innerHTML = "";
        }

        if (!error) {
            //loggedIn = true;
            //WinJS.log && WinJS.log("You have logged in.", "sample", "status");
            WPApi.submitComment(item.post_id,
                document.getElementById("commentName").value.trim(),
                document.getElementById("commentEmail").value.trim(),
                document.getElementById("commentUrl").value.trim(),
                document.getElementById("commentComment").value.trim(),
                function (result) {
                    var data = JSON.parse(result.responseText);
                    if (data.status == 'pending') {
                        document.getElementById('comments#results').innerText = 'Comment submitted. Pending approval.';
                    }
                    else if (data.status == 'ok') {
                        document.getElementById('comments#results').innerText = 'Comment submitted successfully.';
                    }
                    else if (data.status == 'error') {
                        document.getElementById('comments#results').innerText = 'An error occurred: ' + data.error;
                    } else {
                        document.getElementById('comments#results').innerText = result.responseText;
                    }
                },
                function (result) {
                    document.getElementById('comments#results').innerText = 'An error occurred: ' + result.status + ' ' + result.statusText;
                },
                function (result) {
                    document.getElementById('comments#results').innerText = "Posting in progress.";
                }
            );

            document.getElementById("commentFlyout").winControl.hide();
        }
    }

    // On dismiss of the flyout, reset the fields in the flyout
    function onDismiss() {

        // Clear fields on dismiss
        document.getElementById("commentName").value = "";
        document.getElementById("commentNameError").innerHTML = "";
        document.getElementById("commentEmail").value = "";
        document.getElementById("commentEmailError").innerHTML = "";
        document.getElementById("commentComment").value = "";
        document.getElementById("commentCommentError").innerHTML = "";
        document.getElementById("commentUrl").value = "";

        //if (!loggedIn) {
        //    WinJS.log && WinJS.log("You have not logged in.", "sample", "status");
        //}
    }

    WinJS.UI.Pages.define("/pages/post.html", {
        ready: ready,
        updateLayout: updateLayout
    });
})();
        