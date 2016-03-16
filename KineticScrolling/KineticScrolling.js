/**
 * Phaser Kinetic Scrolling Plugin
 * @author       Juan Nicholls <jdnichollsc@hotmail.com>
 * @copyright    2015 Juan Nicholls - http://jdnichollsc.github.io/Phaser-Kinetic-Scrolling-Plugin/
 * @license      {@link http://opensource.org/licenses/MIT}
 * @version 1.0.3
 */

(function (Phaser) {
    'use strict';

    /**
    * Kinetic Scrolling is a Phaser plugin that allows vertical and horizontal scrolling with kinetic motion.
    * It works with the Phaser.Camera
    *
    * @class Phaser.Plugin.KineticScrolling
    * @constructor
    * @param {Object} game - The Game object is the instance of the game, where the magic happens.
    * @param {Any} parent  - The object that owns this plugin, usually Phaser.PluginManager.
    */
    Phaser.Plugin.KineticScrolling = function (game, parent) {
        Phaser.Plugin.call(this, game, parent);


        this.dragging = false;
        this.timestamp = 0;
        this.callbackID = 0;

        this.targetX = 0;
        this.targetY = 0;

        this.autoScrollX = false;
        this.autoScrollY = false;

        this.startX = 0;
        this.startY = 0;

        this.velocityX = 0;
        this.velocityY = 0;

        this.amplitudeX = 0;
        this.amplitudeY = 0;

        this.directionWheel = 0;

        this.velocityWheelX = 0;
        this.velocityWheelY = 0;

        this.settings = {
            kineticMovement: true,
            timeConstantScroll: 325, //really mimic iOS
            horizontalScroll: true,
            verticalScroll: false,
            horizontalWheel: true,
            verticalWheel: false,
            deltaWheel: 40
        };
    };

    Phaser.Plugin.KineticScrolling.prototype = Object.create(Phaser.Plugin.prototype);
    Phaser.Plugin.KineticScrolling.prototype.constructor = Phaser.Plugin.KineticScrolling;

    /**
    * Change Default Settings of the plugin
    *
    * @method Phaser.Plugin.KineticScrolling#configure
    * @param {Object}  [options] - Object that contain properties to change the behavior of the plugin.
    * @param {number}  [options.timeConstantScroll=325] - The rate of deceleration for the scrolling.
    * @param {boolean} [options.kineticMovement=true]   - Enable or Disable the kinematic motion.
    * @param {boolean} [options.horizontalScroll=true]  - Enable or Disable the horizontal scrolling.
    * @param {boolean} [options.verticalScroll=false]   - Enable or Disable the vertical scrolling.
    * @param {boolean} [options.horizontalWheel=true]   - Enable or Disable the horizontal scrolling with mouse wheel.
    * @param {boolean} [options.verticalWheel=false]    - Enable or Disable the vertical scrolling with mouse wheel.
    * @param {number}  [options.deltaWheel=40]          - Delta increment of the mouse wheel.
    */
    Phaser.Plugin.KineticScrolling.prototype.configure = function (options) {

        if (options) {
            for (var property in options) {
                if (this.settings.hasOwnProperty(property)) {
                    this.settings[property] = options[property];
                }
            }
        }

    };

    /**
    * Start the Plugin.
    *
    * @method Phaser.Plugin.KineticScrolling#start
    */
    Phaser.Plugin.KineticScrolling.prototype.start = function () {

        this.game.input.onDown.add(this.beginMove, this);

        this.callbackID = this.game.input.addMoveCallback(this.moveCamera, this);

        this.game.input.onUp.add(this.endMove, this);

        this.game.input.mouse.mouseWheelCallback = this.mouseWheel.bind(this);
    };

    /**
    * Event triggered when a pointer is pressed down, resets the value of variables.
    */
    Phaser.Plugin.KineticScrolling.prototype.beginMove = function () {

        this.startX = this.game.input.x;
        this.startY = this.game.input.y;

        this.dragging = true;

        this.timestamp = Date.now();

        this.velocityY = this.amplitudeY = this.velocityX = this.amplitudeX = 0;

    };

    /**
    * Event triggered when the activePointer receives a DOM move event such as a mousemove or touchmove.
    * The camera moves according to the movement of the pointer, calculating the velocity.
    */
    Phaser.Plugin.KineticScrolling.prototype.moveCamera = function (pointer, x, y) {

        if (!this.dragging) return;

        this.now = Date.now();
        var elapsed = this.now - this.timestamp;
        this.timestamp = this.now;

        if (this.settings.horizontalScroll) {
            var delta = x - this.startX; //Compute move distance
            this.startX = x;
            this.velocityX = 0.8 * (1000 * delta / (1 + elapsed)) + 0.2 * this.velocityX;
            this.game.camera.x -= delta;
        }

        if (this.settings.verticalScroll) {
            var delta = y - this.startY; //Compute move distance
            this.startY = y;
            this.velocityY = 0.8 * (1000 * delta / (1 + elapsed)) + 0.2 * this.velocityY;
            this.game.camera.y -= delta;
        }

    };

    /**
    * Event triggered when a pointer is released, calculates the automatic scrolling.
    */
    Phaser.Plugin.KineticScrolling.prototype.endMove = function () {

        this.dragging = false;
        this.autoScrollX = false;
        this.autoScrollY = false;

        if (!this.settings.kineticMovement) return;

        this.now = Date.now();

        if (this.game.input.activePointer.withinGame && (this.velocityX > 10 || this.velocityX < -10)) {
            this.amplitudeX = 0.8 * this.velocityX;
            this.targetX = Math.round(this.game.camera.x - this.amplitudeX);
            this.autoScrollX = true;
        }

        if (this.game.input.activePointer.withinGame && (this.velocityY > 10 || this.velocityY < -10)) {
            this.amplitudeY = 0.8 * this.velocityY;
            this.targetY = Math.round(this.game.camera.y - this.amplitudeY);
            this.autoScrollY = true;
        }

        if (!this.game.input.activePointer.withinGame) {

            if (this.settings.horizontalScroll) {
                this.autoScrollX = true;
            }
            if (this.settings.verticalScroll) {
                this.autoScrollY = true;
            }
        }
    };

    /**
    * Event called after all the core subsystems and the State have updated, but before the render.
    * Create the deceleration effect.
    */
    Phaser.Plugin.KineticScrolling.prototype.update = function () {

        this.elapsed = Date.now() - this.timestamp;

        if (this.autoScrollX && this.amplitudeX != 0) {

            var delta = -this.amplitudeX * Math.exp(-this.elapsed / this.settings.timeConstantScroll);
            if (delta > 0.5 || delta < -0.5) {
                this.game.camera.x = this.targetX - delta;
            }
            else {
                this.autoScrollX = false;
                this.game.camera.x = this.targetX;
            }
        }

        if (this.autoScrollY && this.amplitudeY != 0) {

            var delta = -this.amplitudeY * Math.exp(-this.elapsed / this.settings.timeConstantScroll);
            if (delta > 0.5 || delta < -0.5) {
                this.game.camera.y = this.targetY - delta;
            }
            else {
                this.autoScrollY = false;
                this.game.camera.y = this.targetY;
            }
        }

        if (this.settings.horizontalWheel && (this.velocityWheelX < -0.1 || this.velocityWheelX > 0.1 || !this.game.input.activePointer.withinGame)) {

            this.game.camera.x -= this.velocityWheelX;
            this.velocityWheelX *= 0.95;
        }

        if (this.settings.verticalWheel && (this.velocityWheelY < -0.1 || this.velocityWheelY > 0.1 || !this.game.input.activePointer.withinGame)) {

            this.game.camera.y -= this.velocityWheelY;
            this.velocityWheelY *= 0.95;
        }
    };

    /**
    * Event called when the mousewheel is used, affect the direction of scrolling.
    */
    Phaser.Plugin.KineticScrolling.prototype.mouseWheel = function (event) {
        if (!this.settings.horizontalWheel && !this.settings.verticalWheel) return;

        event.preventDefault();

        var delta = this.game.input.mouse.wheelDelta * 120 / this.settings.deltaWheel;

        if (this.directionWheel != this.game.input.mouse.wheelDelta) {
            this.velocityWheelX = 0;
            this.velocityWheelY = 0;
            this.directionWheel = this.game.input.mouse.wheelDelta;
        }

        if (this.settings.horizontalWheel) {
            this.autoScrollX = false;

            this.velocityWheelX += delta;
        }

        if (this.settings.verticalWheel) {
            this.autoScrollY = false;

            this.velocityWheelY += delta;
        }

    };

    /**
    * Stop the Plugin.
    *
    * @method Phaser.Plugin.KineticScrolling#stop
    */
    Phaser.Plugin.KineticScrolling.prototype.stop = function () {

        this.game.input.onDown.remove(this.beginMove, this);

        if (this.callbackID) {
            this.game.input.deleteMoveCallback(this.callbackID);
        }
        else {
            this.game.input.deleteMoveCallback(this.moveCamera, this);
        }

        this.game.input.onUp.remove(this.endMove, this);

        this.game.input.mouse.mouseWheelCallback = null;

    };

} (Phaser));
