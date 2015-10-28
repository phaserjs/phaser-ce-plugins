/**
 * Phaser LocalStorage Plugin
 *
 * @author Bogdan Khrupa <lizard.freddi@gmail.com>
 * @license {@link http://opensource.org/licenses/MIT}
 * @version 0.0.1
 */
(function(Phaser) {
    'use strict';

    /**
     * LocalStorage Plugin - simple wrapper for `localStorage` API.
     *
     * @class
     * @param {object} game - The Game object is the instance of the game, where the magic happens.
     * @param {*} parent  - The object that owns this plugin, usually Phaser.PluginManager.
     */
    Phaser.Plugin.LocalStorage = function(game, parent) {
        Phaser.Plugin.call(this, game, parent);

        this.id = '';
        this.supported = this.isSupported();
    };

    Phaser.Plugin.LocalStorage.prototype = Object.create(Phaser.Plugin.prototype);
    Phaser.Plugin.LocalStorage.prototype.constructor = Phaser.Plugin.LocalStorage;

    /**
     * Change storage id key
     *
     * @param {string} id
     */
    Phaser.Plugin.LocalStorage.prototype.setId = function(id) {
        this.id = id || '';
    };

    /**
     * Check `localStorage` support
     *
     * @returns {boolean}
     */
    Phaser.Plugin.LocalStorage.prototype.isSupported = function() {
        if (typeof localStorage !== 'object') {
            return false;
        }
        try {
            localStorage.setItem('localStorage', 1);
            localStorage.removeItem('localStorage');
        }
        catch (e) {
            return false;
        }
        return true;
    };

    /**
     * Set value to storage.
     *
     * @param {string} key
     * @param {*} value
     */
    Phaser.Plugin.LocalStorage.prototype.set = function(key, value) {
        if (!this.supported) {
            return false;
        }
        localStorage.setItem(this.id + '.' + key, this.encode(value));
    };

    /**
     * Get by key from local storage.
     *
     * @param {string} key
     * @param {*} [defaultValue]
     * @returns {*} value
     */
    Phaser.Plugin.LocalStorage.prototype.get = function(key, defaultValue) {
        var raw = localStorage.getItem(this.id + '.' + key);
        if (raw === null) {
            return defaultValue;
        }
        try {
            return this.decode(raw);
        }
        catch (e) {
            return raw;
        }
    };

    /**
     * Check if a key is in local storage.
     *
     * @param {string} key
     * @returns {boolean}
     */
    Phaser.Plugin.LocalStorage.prototype.has = function(key) {
        return localStorage.getItem(this.id + '.' + key) !== null;
    };

    /**
     * Remove key from local storage.
     *
     * @param {string} key
     */
    Phaser.Plugin.LocalStorage.prototype.remove = function(key) {
        localStorage.removeItem(this.id + '.' + key);
    };

    /**
     * Reset local storage, removes ALL keys.
     */
    Phaser.Plugin.LocalStorage.prototype.reset = function() {
        for (var i = localStorage.length - 1; i >= 0; i--) {
            var key = localStorage.key(i);
            if (key.indexOf(this.id + '.') !== -1) {
                localStorage.removeItem(key);
            }
        }
    };

    Phaser.Plugin.LocalStorage.prototype.encode = function(val) {
        return JSON.stringify(val);
    };

    Phaser.Plugin.LocalStorage.prototype.decode = function(str) {
        return JSON.parse(str);
    };

})(Phaser);
