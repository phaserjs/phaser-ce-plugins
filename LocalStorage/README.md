# LocalStorage Plugin

Simple wrapper for [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) API.

## Example

    var game = new Phaser.Game(320, 480, Phaser.AUTO, '', {
        init: function () {
            // Load the plugin
            this.storage = this.game.plugins.add(Phaser.Plugin.LocalStorage);
            // Set custom storage id key, if needed
            //this.storage.setId('MyGame');
        },
        create: function () {
            // Set value
            this.storage.set('foo', 'bar');
            // Get value
            console.log(this.storage.get('foo'));
            
            // Default value
            console.log(this.storage.get('somKey', 'defaultVal')); // defaultVal
            
            // Object
            this.storage.set('obj', {stars: 3, score: 12});
            var lvl = this.storage.get('obj');
            console.log(lvl.score); // 12
            
            // Array
            this.storage.set('arr', [1, 2, 3]);
            console.log(this.storage.get('arr')); // [1, 2, 3]
    
            // Has
            this.storage.set('foo', 'bar');
            console.log(this.storage.has('foo')); // true
    
            // Remove
            this.storage.set('foo', 'bar');
            this.storage.remove('foo', 'bar');
            console.log(this.storage.has('foo')); // false
    
            // Reset all data in storage
            this.storage.set('foo', 'bar');
            this.storage.set('obj', {stars: 3, score: 12});
            this.storage.set('arr', [1, 2, 3]);
    
            this.storage.reset();
    
            console.log(this.storage.has('foo')); // false
            console.log(this.storage.has('obj')); // false
            console.log(this.storage.has('arr')); // false
        }
    });
        