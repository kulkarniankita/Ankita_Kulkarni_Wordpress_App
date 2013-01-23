var BOOKMARKS = -1;
var MOSTRECENT = -2;
var PAGES = -3;

var WPApi = {
    localStorageSchemaVersion: '201304018-76',

    categories: [],
    fetching: false,
    bookmarks: null,
    list: new WinJS.Binding.List(),
    groupedList: null,
    postsFetched: null,
    pagesFetched: true,
    refreshFetch: false,

    apiURL: 'http://ankitakulkarni.0fees.net/wordpress/',

    userAgent: function () {
        return "wp-windows8";
    },

    options: {
        appTitleImage: null,                        // App title image
        appTitle: "Ankita Kulkarni's Blog",                    // App title text
        showRecent: true,                           // Enabled recent news category 
        showPages: false,                            // Show pages in the main page
        showPageIds: [1,2,3],                           // show pages by id
        showCatIds: [41, 31, 21, 11],                  // Categories to show in the landing page order i.e. [1, 2, 3, 4]
        numberOfRelatedPosts: 4,                   // Number of related posts to display in the Post page
        cacheTime: 3600000,                         // Cache time to try fetch latest       
    },

    // set the number of show on the landing page per category
    getNumberOfTiles: function () {
        var h = window.innerHeight;
        if (h > 1919)
            return 12; 
        else if (h > 1199)
            return 12;
        else if (h > 1024)
            return 12;
        else
            return 12;
    },

    // The fetch Page size per category
    getDefaultPostCount: function () {
        // all values dividable by 2, 3 or 4 for nicer rows layout
        var w = window.innerWidth;
        if (w > 1900)
            return 24;
        else if (w > 1300)
            return 18;
        else
            return 12;
    },

    shouldFetchPages: function () {
        if (WPApi.pagesFetched) {
            if (new Date() - WPApi.pagesFetched > WPApi.options.cacheTime) {
                return true;
            }
            return false;
        }
        return true;
    },


    shouldFetchPosts: function () {
        if (WPApi.postsFetched) {
            if (new Date() - WPApi.postsFetched > WPApi.options.cacheTime) {
                return true;
            }
            return false;
        }
        return true;
    },

    // Create new data source and fetch data from Wordpress JSON API plugins
    newDataSource: function () {
        var self = this;

        return new WinJS.Promise(function (comp, err, prog) {
            if (!WPApi.shouldFetchPosts()) {
                WPApi.categories[BOOKMARKS].getData(0).then(function(){
                    comp();
                });
            }

            self.list = new WinJS.Binding.List();
            self.groupedList = self.list.createGrouped(self.getGroupKey, self.getGroupData, self.compareGroups);

            // Fetch posts from each category
            self.getAllCategories().then(function (promises) {               

                // Fetch pages
                if (self.options.showPages) {
                    WPApi.categories[PAGES] = new wpapiCategory({ id: PAGES, title: " " });
                    promises.push(WPApi.categories[PAGES].getData(0));
                }

                // Fetch most recent posts
                if (self.options.showRecent) {
                    WPApi.categories[MOSTRECENT] = new wpapiCategory({ id: MOSTRECENT, title: "Recent News" });
                    promises.push(WPApi.categories[MOSTRECENT].getData(0));
                }

                // Fetch saved bookmarked posts
                WPApi.categories[BOOKMARKS] = new wpapiCategory({ id: BOOKMARKS, title: "Bookmarks" });
                promises.push(WPApi.categories[BOOKMARKS].getData(0));

                // Wait for all fetch to complete
                WinJS.Promise.join(promises).then(function () {

                    // Update the grouped list for the main page
                    self.updateList();

                    // Update the tile if needed.
                    if (null == WPApiTile.data)
                        WPApiTile.init();

                    WPApi.postsFetched = new Date();

                    comp();
                }, function (e) { err(e); }, function (p) { prog(p); });
            }, function (e) {
                err(e);
            }, function (p) {
                prog(p);
            });
        });
    },

    // Fetch posts from categories
    getAllCategories: function () {
        var self = this;
        return new WinJS.Promise(function (comp, err, prog) {

            var promises = new Array();
            if (false !== self.fetching) {
                self.fetching.cancel();
            }

            var url = WPApi.apiURL;
            var query_string = '?json=get_category_index';

            var full_url = url + query_string;
            var headers = { "User-Agent": WPApi.userAgent() };
            var catId = [];

            self.fetching = WinJS.xhr({ type: 'GET', url: full_url, headers: headers }).then(function (r) {
                var data = JSON.parse(r.responseText);

                // Fetch posts for each category or categories defined in the options
                for (var p = 0; p < data.categories.length; p++) {
                    if (WPApi.options.showCatIds.indexOf(data.categories[p].id) >= 0 || WPApi.options.showCatIds.length == 0) {
                        data.categories[p].title = WPApi.decodeEntities(data.categories[p].title);
                        var value = data.categories[p];
                        WPApi.categories[value.id] = new wpapiCategory(value);
                        promises.push(WPApi.categories[value.id].getData(0));
                    }
                }

                localStorage["CAT-RESPONSE"] = JSON.stringify(data);
                self.fetching = false;
                comp(promises);
            },
            // If no internet connection, try to fetch from the localStorage
            function (f) {
                if (f.name == 'Canceled') {
                    err();
                }
                else if (localStorage["CAT-RESPONSE"]) {
                    data = JSON.parse(localStorage["CAT-RESPONSE"]);
                    for (var p = 0; p < data.categories.length; p++) {
                        if (WPApi.options.showCatIds.indexOf(data.categories[p].id) >= 0 || WPApi.options.showCatIds.length == 0) {
                            var value = data.categories[p];
                            WPApi.categories[value.id] = new wpapiCategory(value);
                            promises.push(WPApi.categories[value.id].getData(0));
                        }
                    }
                    self.fetching = false;
                    comp(promises);
                }
                else {
                    self.fetching = false;
                    err(f);
                }
            },
            function (p) {
                prog(p);
            });
        });
    },

    // Search for posts
    search : function(query) {
        var self = this;

        return new WinJS.Promise(function (comp, err, prog) {
            prog(0);

            var query_string = '?json=get_search_results&search=' + query;

            var full_url = WPApi.apiURL + query_string;
            var headers = { "User-Agent": WPApi.userAgent() };

            if (false !== self.fetching) {
                self.fetching.cancel();
            }

            self.fetching = WinJS.xhr({ type: 'GET', url: full_url, headers: headers }).then(function (r) {
                var data = JSON.parse(r.responseText);
                 
                var items = new WinJS.Binding.List();
                for (var d in data.posts) {
                    var item = WPApi.convertItem(data.posts[d]);
                    item.local_storage_key = "-4" + '.' + item.post_id;
                    items.push(item);
                }
                self.fetching = false;
                comp(items);
            }, function (e) { err(e); }, function (p) { prog(p);});
        });
    },

    // Post comment
    submitComment: function (post_id, name, email, url, comment, c, r, p) {

        var full_url = WPApi.apiURL + '?json=submit_comment&post_id=' + post_id + '&name=' + escape(name) + '&email=' + escape(email) + '&content=' + escape(comment);
        var headers = { "User-Agent": WPApi.userAgent() };

        WinJS.xhr({ type: "POST", url: full_url, headers: headers }).done(
            function completed(result) {
                c(result);
            },
            function error(result) {
                r(result);
            },
            function progress(result) {
                p(result);
            }
       );
    },

    // Get Bookmarks from local storage
    getBookmarks: function () {
        if (!localStorage[BOOKMARKS]) {
            localStorage[BOOKMARKS] = JSON.stringify({ 'post_count': 0, 'posts': [], 'lastFetched': new Date() });
        }

        this.bookmarks = JSON.parse(localStorage[BOOKMARKS]);
        return this.bookmarks;
    },

    // Check if a post has been bookmarked
    checkIsBookmarked : function(id){
        var bookmarks = this.getBookmarks();
        for (var index in bookmarks.posts) {
            if (id == bookmarks.posts[index].post_id)
                return true;
        }
        return false;
    },

    // Add post to bookmark
    addToBookmark: function (item) {
        var bookmarks = this.getBookmarks();
        for (var index in bookmarks.posts) {
            if (item.id == bookmarks.posts[index].post_id) {
                return;
            }
        }       

        bookmarks.posts.push(item);
        bookmarks.post_count = bookmarks.posts.length;
        localStorage[BOOKMARKS] = JSON.stringify(bookmarks);
    },

    // Remove post to bookmark
    removeFromBookmark: function (id) {
        var bookmarks = this.getBookmarks();
        for (var index in bookmarks.posts) {
            if (id == bookmarks.posts[index].post_id) {
                bookmarks.posts.splice(index, 1);
                break;
            }
        }
        bookmarks.post_count = bookmarks.posts.length;
        localStorage[BOOKMARKS] = JSON.stringify(bookmarks);
    },

    // Escape characters
    decodeEntities: function (s) {
        var str, temp = document.createElement('p');
        temp.innerHTML = s;
        str = temp.textContent || temp.innerText;
        temp = null;
        return str;
    },

    // Translate JSON API to view model
    convertItem: function (item) {
        var res = {
            type : 'post',
            post_title: this.decodeEntities(item.title),
            post_id: item.id,
            content: item.content,
            ts: item.date.substr(0, 10),
            permalink: item.url.replace(/^https:/, 'http:'),
            post_date: item.date.replace(' ', 'T'),
            post_author: item.author.id,
            author_name: item.author.name,
            comments: item.comments
        };

        // get the first image from attachments
        res.post_image = 'ms-appx:/images/blank.png';
        for (var i in item.attachments) {
            if (item.attachments[i].url != "") {
                res.post_image = item.attachments[i].url;
                break;
            }
            else if (item.attachments[i].images != null) {
                res.post_image = item.attachments[i].images.full.url;
                break;
            }
        }

        var subtitle = '';
        for (var i in item.categories)
        {
            subtitle = subtitle + ', ' + this.decodeEntities(item.categories[i].title);
        }
        res.post_subtitle = subtitle.substring(2);

        return res;
    },
    
    visibilityConverter: WinJS.Binding.converter(function (val) {
        return val ? "block" : "none";
    }),

    convertPage: function (item, list, parentId) {
        var res = {
            type : 'page',
            post_title: this.decodeEntities(item.title),
            post_id: item.id,
            content: item.content,
            ts: item.date.substr(0, 10),
            permalink: item.url.replace(/^https:/, 'http:'),
            post_date: item.date.replace(' ', 'T'),
            post_author: item.author.id,
            author_name: item.author.name,
            comments: item.comments,
            parentId: parentId,
            hasChildren : false
        };

        // get the first image from attachments
        res.post_image = 'ms-appx:/images/blank.png';
        for (var i in item.attachments) {
            if (item.attachments[i].url != "") {
                res.post_image = item.attachments[i].url;
                break;
            }
            else if (item.attachments[i].images != null) {
                res.post_image = item.attachments[i].images.full.url;
                break;
            }
        }

        // we are ok as long as Wordpress doesn't allow cyclic parent-children relationship!
        for (var i in item.children) {
            WPApi.convertPage(item.children[i], list, res.id);
            res.hasChildren = true;
        }
        res.post_subtitle = "";
        if (WPApi.options.showPageIds.length == 0 || WPApi.options.showPageIds.indexOf(res.post_id) > -1) {
            list.push(res);
        }
        return;
    },

    // Determine ordering of the groups
    compareGroups: function (a, b) {
        // most recent posts is first
        if (a == PAGES)
            return -1;
        if (b == PAGES)
            return 1;

        // most recent posts is second
        if (a == MOSTRECENT)
            return -1;
        if (b == MOSTRECENT)
            return 1;
        // bookmarked posts is third
        if (a == BOOKMARKS)
            return -1;
        if (b == BOOKMARKS)
            return 1;

        // if showCatIds exists, we will use the order defined from showCatIds
        if (WPApi.options.showCatIds && WPApi.options.showCatIds.length > 0) {
            var aIndex = WPApi.options.showCatIds.indexOf(a);
            var bIndex = WPApi.options.showCatIds.indexOf(b);
            if (aIndex < bIndex)
                return -1;
            else
                return 1;
        }

        // otherwise just use the Category ID
        if (a < b)
            return -1;
        else
            return 1;
    },

    getGroupKey : function (dataItem) {
        return dataItem.primary_cat.id;
    },

    getGroupData : function (dataItem) {
        var date = new Date(dataItem.ts);
        var groupKey = dataItem.primary_cat.id;
        var index = WPApi.list.indexOf(dataItem);

        if (dataItem.type == 'page') {
            return {
                category_id: dataItem.primary_cat.id,
                category_title: ' ',
                category_count: ' '
            };            
        }
        else {
            return {
                category_id: dataItem.primary_cat.id,
                category_title: WPApi.decodeEntities(dataItem.primary_cat.title),
                category_count: dataItem.primary_cat.post_count,
                headerClick: WinJS.Utilities.markSupportedForProcessing(function (e) {
                    WPApi.showCategory(e.target.catId);
                })
            };
        }
    },

    // Combine the posts from each category into a grouped list
    updateList: function () {
        WPApi.list = new WinJS.Binding.List();
        WPApi.groupedList = WPApi.list.createGrouped(WPApi.getGroupKey, WPApi.getGroupData, WPApi.compareGroups);
        for (var c in this.categories) {
            if (c.id == PAGES) {
                for (var p = 0; p < this.categories[c].list; p++) {
                    WPApi.list.push(pages[p]);
                }
            }
            else {
                var maxget = Math.min(WPApi.getNumberOfTiles(), WPApi.categories[c].list.length);
                for (var i = 0; i < maxget; i++) {
                    WPApi.list.push(WPApi.categories[c].list.getAt(maxget - i - 1));
                }
            }
        }
    },

    timeSince: function (date) {
        var seconds = Math.floor((new Date().getTime() / 1000) - (new Date(date).getTime() / 1000));

        var interval = Math.floor(seconds / 31536000);
        var timeago = '';

        if (interval >= 1) {
            timeago = interval + " year";
        } else {
            interval = Math.floor(seconds / 2592000);
            if (interval >= 1) {
                timeago = interval + " month";
            } else {
                interval = Math.floor(seconds / 86400);
                if (interval >= 1) {
                    timeago = interval + " day";
                } else {
                    interval = Math.floor(seconds / 3600);
                    if (interval >= 1) {
                        timeago = interval + " hour";
                    } else {
                        interval = Math.max(1, Math.floor(seconds / 60));
                        timeago = interval + " minute";
                    }
                }
            }
        }

        if (1 != interval)
            timeago = timeago + 's';
        return timeago;
    },

    showUrl: function (url) {
        try {
            var uri = Windows.Foundation.Uri(url);

            var options = new Windows.System.LauncherOptions();
            options.displayApplicationPicker = true;

            Windows.System.Launcher.launchUriAsync(uri, options).then(function (success) {
            });
        }
        catch (err) {
            //error
            return;
        }
    },

    toggleElement: function (e, status) {
        if (null == e)
            return;
        if ('hide' == status || (WinJS.Utilities.hasClass(e, 'show') && 'show' != status)) {
            if (WinJS.Utilities.hasClass(e, 'show'))
                WinJS.Utilities.removeClass(e, 'show');
            WinJS.Utilities.addClass(e, 'hide');
        } else {
            if (WinJS.Utilities.hasClass(e, 'hide'))
                WinJS.Utilities.removeClass(e, 'hide');
            WinJS.Utilities.addClass(e, 'show');
        }
    },

    toggleLoader: function (status) {
        WPApi.toggleElement(document.getElementById('loader'), status);
    },

    toggleError: function (status) {
        WPApi.toggleElement(document.querySelector('div.error'), status);
    },

    // Resize image
    fadeImage: function (img) {
        WinJS.Utilities.addClass(img, 'fadeIn');
        var ph = parseInt(img.parentElement.style.height);
        var pw = parseInt(img.parentElement.style.width);
        var cw = img.naturalWidth;
        var ch = img.naturalHeight;
        if (ch * pw / ph > cw) {
            img.style.width = pw + "px";
            ch = pw * ch / cw;
            img.style.height = ch + "px";
            img.style.top = "" + ((ph - ch) / 2) + "px";
        }
        else {
            img.style.height = ph + "px";
            cw = ph * cw / ch
            img.style.width = cw + "px";
            img.style.left = "" + ((pw - cw) / 2) + "px";
        }
    },


    // Navigate to the Post page
    showPost: function (eventObject) {
        if (eventObject.target.querySelector('.post')) {
            var eId = eventObject.target.querySelector('.post').id;
            var item = WPApi.groupedList.getAt(eventObject.detail.itemIndex);

            WinJS.Navigation.navigate("/pages/post.html", { item: item });
        }
        else{
            var eId = eventObject.target.querySelector('.page').id;
            var item = WPApi.groupedList.getAt(eventObject.detail.itemIndex);

            WinJS.Navigation.navigate("/pages/page.html", { item: item });
        }
    },

    // Navigate to the Category page
    showCategory: function(id) {
        var cat = WPApi.categories[id];
        WinJS.Navigation.navigate("/pages/cat-posts.html", { cat: cat });
    },

    // Refresh the app
    refresh: function () {
        document.getElementById('appbar').winControl.hide();

        if (WPApi.refreshFetch !== false) {
            return;
        }

        WPApi.toggleError('hide');
        WPApi.toggleLoader('show');
        WPApi.list.clear();
        WPApi.list = new WinJS.Binding.List();
        WPApi.groupedList = WPApi.list.createGrouped(WPApi.getGroupKey, WPApi.getGroupData, WPApi.compareGroups);

        document.getElementById("allposts-list").winControl.itemDataSource = null;
        document.getElementById("allposts-list").winControl.groupDataSource = null;
        var promises = new Array();        

        WPApi.refreshFetch = true;

        for(var i in WPApi.categories)
        {
            if (false !== WPApi.categories[i].fetching) {
                WPApi.categories[i].fetching.cancel();
                WPApi.categories[i].fetching = false;
            }
            localStorage.removeItem(WPApi.categories[i].id);
            promises.push(WPApi.categories[i].reset());
        }

        WinJS.Promise.join(promises).then(function () {
            // Update the tile if needed.
            if (null == WPApiTile.data)
                WPApiTile.init();

            WPApi.updateList();

            document.getElementById("allposts-list").winControl.itemDataSource = WPApi.groupedList.dataSource;
            document.getElementById("allposts-list").winControl.groupDataSource = WPApi.groupedList.groups.dataSource;
            document.getElementById("allposts-list").winControl.scrollPosition = 0;
            WPApi.refreshFetch = false;
        }, function (e) {
            WPApi.toggleLoader('hide');
            WPApi.refreshFetch = false;
        }, function (p) { });
    },

    // if localStorage schema drastically changes from one version to the other, we can reset it easily
    // to comply on app launch by updating WPApi..localStorageSchemaVersion in new releases when needed
    checkLocalStorageSchemaVersion: function () {
        if (null == localStorage || null == localStorage.schemaVersion || localStorage.schemaVersion != this.localStorageSchemaVersion)
            WPApi.clearLocalStorage();
    },

    clearLocalStorage: function () {
        localStorage.clear();
        localStorage.schemaVersion = this.localStorageSchemaVersion;
    },

    // Get Post from location storage
    getPost: function (post_id) {
        for (var c in WPApi.categories) {
            var key = WPApi.categories[c].list._keyMapper[post_id];
            if (key)
                return WPApi.categories[c].list.getItemFromKey(key).data;
        }
    },

    // Opens link in an iframe
    iframePostLinks: function () {
        var links = document.querySelectorAll('.content a');
        for (var i = 0; i < links.length; i++) {
            links[i].onclick = undefined;
            links[i].addEventListener('click', function (e) {
                e.preventDefault();
                if (Windows.UI.ViewManagement.ApplicationView.value == Windows.UI.ViewManagement.ApplicationViewState.snapped)
                    top.location.href = this.getAttribute('href');
                else 
                    WPApi.renderIframeView(this.getAttribute('href'));
            });
        }
    },

    // Render iframe view
    renderIframeView: function (href) {
        document.getElementById('appbar').winControl.hide();

        var iframe = document.createElement("iframe");
        var backbar = document.createElement("div");
        var loader = document.createElement('progress');

        document.body.appendChild(iframe);
        iframe.setAttribute('src', href);
        iframe.setAttribute('id', 'external-link');

        loader.setAttribute('id', 'iframe-loader');
        loader.setAttribute('class', 'win-ring');

        document.body.appendChild(loader);
        document.body.appendChild(backbar);

        backbar.setAttribute('id', 'backbar');
        var backlink = document.createElement("button");
        backlink.setAttribute('id', 'backlink');
        backbar.appendChild(backlink);
        backlink.setAttribute('class', 'win-backbutton');

        WPApi.toggleElement(document.getElementById('like'), 'hide');
        WPApi.toggleElement(document.getElementById('home'), 'hide');


        document.querySelector("button#viewblog span.win-label").innerHTML = 'View in Browser';
        WinJS.Utilities.addClass(document.querySelector("button#viewblog"), 'open-in-browser');
        
        backlink.addEventListener('click', function (e) {
            e.preventDefault();
            loader.setAttribute('class', 'hide');
            iframe.setAttribute('class', 'loaded');
            backlink.removeNode();
            iframe.removeNode();
            backbar.removeNode();
            loader.removeNode();
            WPApi.toggleElement(document.getElementById('like'), 'show');
            WPApi.toggleElement(document.getElementById('home'), 'show');
            
            document.querySelector("button#viewblog span.win-label").innerHTML = 'View Blog';
            WinJS.Utilities.removeClass(document.querySelector("button#viewblog"), 'open-in-browser');        
        });

        iframe.addEventListener('load', function () {
            loader.setAttribute('class', 'hide');
            iframe.setAttribute('class', 'loaded');
        });
    },
    
    keyMapper : function (a) {
        if (a.target._keyMapper == null)
            a.target._keyMapper = [];
        a.target._keyMapper[a.detail.value.post_id] = a.detail.key;
    }
}

function wpapiCategory(category) {
    this.id = category.id;
    this.title = category.title;
    this.post_count = category.post_count;
    this.category = category;
    this.count = 0;
    this.list = new WinJS.Binding.List();
    this.list.oniteminserted = WPApi.keyMapper;
    this.fetching = false;
    this.scrollPosition = 0;
    this.lastFetched = new Date(1900, 1, 1);
}

wpapiCategory.prototype.getPages = function (force) {
    var self = this;
    return new WinJS.Promise(function (comp, err, prog) {

        var promises = new Array();
        if (false !== self.fetching) {
            self.fetching.cancel();
        }

        var url = WPApi.apiURL;
        var query_string = '?json=get_page_index';

        var full_url = url + query_string;
        var headers = { "User-Agent": WPApi.userAgent() };
        var catId = [];
        if (!WPApi.shouldFetchPages()) {
            self.fetching = false;
            comp();
        }

        if (!force && localStorage["pages"] && localStorage["pages-fetched"]) {
            var date = JSON.parse(localStorage["pages-fetched"]).date;
            if ((new Date() - new Date(date) < WPApi.options.cacheTime)) {
                self.list = new WinJS.Binding.List();

                var pages = JSON.parse(localStorage["pages"]).pages;
                for (var index in pages) {
                    self.list.push(pages[index]);
                }
                self.fetching = false;
                comp();
            }
        }

        self.fetching = WinJS.xhr({ type: 'GET', url: full_url, headers: headers }).then(function (r) {
            var data = JSON.parse(r.responseText);
            
            // Fetch posts for each category or categories defined in the options
            self.list = new WinJS.Binding.List();
            var pages = new Array();
            for (var p = 0; p < data.pages.length; p++) {
                WPApi.convertPage(data.pages[p], pages, 0);
            }
            for (var i in pages) {
                pages[i].local_storage_key = self.category.id + '.' + i;
                var date = new Date(item.ts);
                pages[i].primary_cat = self.category;
                pages[i].categories = [];
            }

            localStorage["pages"] = JSON.stringify({ pages : pages});
            for (var index in pages) {
                self.list.push(pages[index]);
            }
            self.fetching = false;

            WPApi.pagesFetched = new Date();
            localStorage["pages-fetched"] = JSON.stringify({ date: WPApi.pagesFetched });
            comp();
        },
        // If no internet connection, try to fetch from the localStorage
        function (f) {
            if (localStorage["pages"]) {
                self.list = new WinJS.Binding.List();
                var pages = JSON.parse(localStorage["pages"]).pages;
                for (var index in pages) {
                    self.list.push(pages[index]);
                }
                self.fetching = false;
                comp();
            }
            else {
                self.fetching = false;
                err(f);
            }
        },
        function (p) {
            prog(p);
        });
    });

},


// Get posts for a category
wpapiCategory.prototype.getData = function (page, force) {
    var self = this;

    // get pages
    if (self.id == PAGES){
        return self.getPages(force);
    }
    return new WinJS.Promise(function (comp, err, prog) {
        if (false !== self.fetching) {
            self.fetching.cancel()
        }

        var url = WPApi.apiURL;
        var query_string;

        if (self.id == BOOKMARKS) {
            self.fetching = true;

            var bookmarks = WPApi.getBookmarks();
            self.category.post_count = bookmarks.post_count;
            self.category.lastFetched = bookmarks.lastFetched;

            self.list = new WinJS.Binding.List();

            for (var i = 0; i < bookmarks.posts.length; i++) {
                bookmarks.posts[i].primary_cat = self.category;
                self.list.push(bookmarks.posts[i]);
            }
            self.count = bookmarks.posts.length;
            self.fetching = false;

            comp(0);
            return;
        }
        else if (self.id == MOSTRECENT)
            query_string = '?json=get_recent_posts&count=' + WPApi.getDefaultPostCount() + "&page=" + (page + 1);
        else
            query_string = '?json=get_category_posts&id=' + self.id + '&count=' + WPApi.getDefaultPostCount() + "&page=" + (page + 1);

        var localStorageObject;

        if (localStorage[self.category.id] != null) {
            localStorageObject = JSON.parse(localStorage[self.category.id]);
            self.lastFetched = localStorageObject.lastFetched;
        }

        var full_url = url + query_string;
        var headers = { "User-Agent": WPApi.userAgent() };

        if (!localStorageObject || localStorageObject.posts.length == 0 || force ||
            (page == 0 && (new Date() - new Date(localStorageObject.lastFetched) > WPApi.options.cacheTime)) ||
            (page > 0 || (self.list.length / WPApi.getDefaultPostCount()) > page)) {
            self.fetching = WinJS.xhr({ type: 'GET', url: full_url, headers: headers }).then(function (r) {
                var data = JSON.parse(r.responseText);
                if (data.status != "ok")
                    return;

                self.count = self.count + data.count;
                if (data.category != null) {
                    self.category.post_count = data.category.post_count;
                    self.post_count = data.category.post_count;
                }
                else {
                    self.category.post_count = data.count_total;
                    self.post_count = data.count_total;
                }


                if (data.count > 0)  {
                    var items = self.addItemsToList(data.posts, self.category);
                    // overwrite local storage if we are fetching the first page
                    if (localStorageObject == null || page == 0) {
                        localStorageObject = { 'post_count': self.post_count, 'posts': items, 'lastFetched': new Date() };
                    }
                    else
                    {
                        for (var index in items) {
                            localStorageObject.posts.push(items[index])
                        }
                    }

                    localStorage[self.category.id] = JSON.stringify(localStorageObject);
                }
                self.fetching = false;
                comp(0);
            },
            function (m) {
                // if connection failed, we will try to load from localStorage
                if (localStorageObject) {
                    self.category.post_count = localStorageObject.post_count;
                    self.category.lastFetched = localStorageObject.lastFetched;

                    for (var index in localStorageObject.posts) {
                        self.list.push(localStorageObject.posts[index]);
                    }
                    self.count = localStorageObject.posts.length;
                    self.fetching = false;
                    comp(0);
                }
                err(m);
            },
            function (p) {
                prog(p);
            });
        }
        else if (self.list.length <= localStorageObject.posts.length) {
            self.category.post_count = localStorageObject.post_count;
            self.category.lastFetched = localStorageObject.lastFetched;

            for (var index in localStorageObject.posts) {
                self.list.push(localStorageObject.posts[index]);
            }            
            self.count = localStorageObject.posts.length;
            self.fetching = false;
            comp(0);
        }
        else {
            err(0);
        }
    });
}

wpapiCategory.prototype.addItemsToList = function (jsonPosts, primaryCat) {
    var itemArray = new Array();
    for (var key in jsonPosts) {
        if (jsonPosts[key].categories.length > 0) {
            var item = WPApi.convertItem(jsonPosts[key]);

            item.local_storage_key = primaryCat.id + '.' + key;

            var date = new Date(item.ts);

            item.primary_cat = primaryCat;
            item.categories = jsonPosts[key].categories;
            
            var insert = true;
            this.list.forEach(function (value) { if (value.post_id == item.post_id) { insert = false; } });
            if (insert) {
                this.list.push(item);
                itemArray.push(item);
            }
        }
    }
    return itemArray;
}


wpapiCategory.prototype.reset = function (skipData, onlyResetLists) {
    this.list = new WinJS.Binding.List();
    self.count = 0;
    return this.getData(0, true);
}


WinJS.Binding.List.prototype.clear = function () { while (this.length > 0) this.pop(); };