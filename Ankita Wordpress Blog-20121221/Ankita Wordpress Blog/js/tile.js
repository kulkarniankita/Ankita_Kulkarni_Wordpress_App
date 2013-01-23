var WPApiTile = {
    data: null,
    tile: null,

    init: function () {
        // Clear existing tile and build them fresh
        WPApiTile.clear();

        // Create the new tile
        WPApiTile.create();
    },

    create: function () {
        // Make sure we have data
        if (!WPApi.categories[MOSTRECENT].count)
            return;

        WPApiTile.data = WPApi.categories[MOSTRECENT].list.dataSource;

        var tileUpdateManager = Windows.UI.Notifications.TileUpdateManager.createTileUpdaterForApplication();
        tileUpdateManager.enableNotificationQueue(true);
        var count = 0;
        // Loop the newest 5 posts.
        for (var i = 0; i < WPApiTile.data.list.length; i++) {
            var post = WPApiTile.data.list.getAt(i);
            
            if (!post)
                continue;

            if (post.type == 'page')
                continue;

            if (++count > 5)
                break;

            // Long Tile
            var template = Windows.UI.Notifications.TileTemplateType.tileWideImageAndText01;
            var tileXml = Windows.UI.Notifications.TileUpdateManager.getTemplateContent(template);
            var tileImageElements = tileXml.getElementsByTagName("image");
            tileImageElements[0].setAttribute("src", post.post_image);
            tileImageElements[0].setAttribute("alt", "Post Image");

            var tileTextElements = tileXml.getElementsByTagName("text");
            tileTextElements[0].appendChild(tileXml.createTextNode(post.post_title));

            // Square Tile
            var template = Windows.UI.Notifications.TileTemplateType.tileSquareImage;
            var squareTileXml = Windows.UI.Notifications.TileUpdateManager.getTemplateContent(template);
            var squareTileImageElements = squareTileXml.getElementsByTagName("image");
            squareTileImageElements[0].setAttribute("src", post.post_image);
            squareTileImageElements[0].setAttribute("alt", "Post Image");

            // Add Square to Long tile
            var binding = squareTileXml.getElementsByTagName("binding").item(0);
            var node = tileXml.importNode(binding, true);
            tileXml.getElementsByTagName("visual").item(0).appendChild(node);

            WPApiTile.tile = new Windows.UI.Notifications.TileNotification(tileXml);
            WPApiTile.send();
        }
    },

    send: function() {
        Windows.UI.Notifications.TileUpdateManager.createTileUpdaterForApplication().update(WPApiTile.tile);
    },

    clear: function () {
        WPApiTile.data = null;
        WPApiTile.tile = null;

        Windows.UI.Notifications.TileUpdateManager.createTileUpdaterForApplication().clear();
    }
}