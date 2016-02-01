/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Ivanix Mobile LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

/*
 * Plugin: SaveCPU
 * Author: Ivanix @ Ivanix Mobile LLC
 * Purpose:  Reduce CPU usage caused from redudant rendering
 *           on idle or static display scenes
 *           reduce fps for casual/puzzle games
 *
 *
 * Configurable Properties:
 *                
 * [renderOnFPS]   
 * Constrains maximum FPS to value set. 
 * Reasonable values from 0 to 60 
 * Default value 30
 * Set value to 0 disable rendering based on FPS
 * and use methods described below.
 *
 * [renderOnPointerChange]   
 * Render when pointer movement detected.
 * Possible values  "true" or "false"
 * Default: false
 * Note that renderOnFPS must be set to 0
 *
 *
 * Callable Methods:
 * 
 * [forceRender()]
 * Forces rendering during core game loop
 * Can be called independently or in tandem with above properties.
 * Should be called inside update function.
 * @class Phaser.Plugin.SaveCPU
 */

/*global
    Phaser: true,
    window: true
 */
/*jslint nomen: true */

Phaser.Plugin.SaveCPU = function (game, parent) {
    'use strict';
    Phaser.Plugin.call(this, game, parent);

};
Phaser.Plugin.SaveCPU.prototype = Object.create(Phaser.Plugin.prototype);
Phaser.Plugin.SaveCPU.constructor = Phaser.Plugin.SaveCPU;
 
Phaser.Plugin.SaveCPU.prototype.init = function () {
    'use strict';
    var thisObj;

    this.__defineSetter__("renderOnFPS", function(v) {
        this._renderOnFPS = v;
        this._tsdiff = (1000 / v);
    });
    this.__defineGetter__("renderOnFPS", function() {
        return this._renderOnFPS;
    });    
    this._tsdiff = 0;    

    // fps default
    this.renderOnFPS = 30;
    this.renderOnPointerChange = false;
    this.renderDirty = true;
    
    if(this.game.updateRender) {
        this._init1();
    } else {
        this._init0();
    }
    
    this.fpsDirty = 0;
    this.hrts  = 0;

    thisObj = this;
    window.requestAnimationFrame(function(hrts) {
        thisObj._trackFPS(hrts);
    });     
};
Phaser.Plugin.SaveCPU.prototype._init0 = function () {
    this.renderType = this.game.renderType;
    this.switchRender = this._switchRender0;
};
Phaser.Plugin.SaveCPU.prototype._init1 = function () {
    var game = this.game;

    game.updateRenderReal = game.updateRender;
    game.updateRenderNull = function() {};
    this.switchRender = this._switchRender1;
};
Phaser.Plugin.SaveCPU.prototype._trackFPS = function (hrts) { 
    var thisObj, diff;

    diff = hrts - this.hrts;
    if (diff > this._tsdiff) {
        this.fpsDirty = true;
        this.hrts = hrts;
    }
    
    thisObj = this;
    window.requestAnimationFrame(function(hrts) {
        thisObj._trackFPS(hrts);
    });   
 
};
Phaser.Plugin.SaveCPU.prototype._switchRender0 = function () {
    'use strict';
    var game = this.game;
    if (this.renderDirty) {
        game.renderType = this.renderType;
    } else {
        game.renderType = Phaser.HEADLESS;
    }
    this.renderDirty = false;
};
Phaser.Plugin.SaveCPU.prototype._switchRender1 = function () {
    'use strict';
    var game = this.game;
    if (this.renderDirty) {
        game.updateRender = game.updateRenderReal;
    } else {
        game.updateRender = game.updateRenderNull;
    }
};
Phaser.Plugin.SaveCPU.prototype.forceRender = function () {
    'use strict';
    this.renderDirty = true;
};
Phaser.Plugin.SaveCPU.prototype._forceRenderOnPointerChange = function () {
    'use strict';
    if(!this.renderOnPointerChange) {
        return false;
    }
    var input = this.game.input;

    if (input.oldx !== input.x || input.oldy !== input.y) {
        this.forceRender();
        input.oldx = input.x;
        input.oldy = input.y;
    }
    if (input.oldDown !== input.activePointer.isDown) {
        this.forceRender();
        input.oldDown = input.activePointer.isDown;
    }
};
Phaser.Plugin.SaveCPU.prototype._forceRenderOnFPS = function () {
    'use strict';
    
    if(this.renderOnFPS && this.fpsDirty) {
        this.fpsDirty = false;
        this.forceRender();
        return true;
    } else {
        return false;
    }
};
Phaser.Plugin.SaveCPU.prototype.postUpdate = function () {
    'use strict';
    if (this.renderDirty || this._forceRenderOnFPS()|| this._forceRenderOnPointerChange()) {
        this.switchRender();
        return;
    }
};
Phaser.Plugin.SaveCPU.prototype.postRender= function () {
    'use strict';
    if (this.renderDirty) {
        this.renderDirty = false;
        this.switchRender();
    }
};


