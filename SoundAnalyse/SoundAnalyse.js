/**
* @author       Zharko Simonovski <zarko.simonovski@gmail.com>
* @copyright    2015 Zharko Simonovski
* @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
*/

/**
* Enable you to create sound analyse object and get audio data
* You can create graphical sound analyse sprite which will auto draw your selection: char, time frequency line, stereo or audio bar, background gradient...
* You can also create a audio analyse sprite with graphic representation
*
* @class Phaser.Plugin.SoundAnalyze
* @constructor
* @param {Phaser.Game} game - Game reference to the currently running game.
* @return {Phaser.Plugin.SoundAnalyze}
*/
Phaser.Plugin.SoundAnalyse = function (game) {

	Phaser.Plugin.call(this, game);
	
	/** --- SOUND ANALYSER --- **/

	/**
	* The Sound Analyser class constructor.
	*
	* @class Phaser.SoundAnalyser
	* @extends Phaser.Sound
	* @constructor
	* @param {Phaser.Game} game - Reference to the current game instance.
	* @param {string} key - Asset key for the sound.
	* @param {number} [volume=1] - Default value for the volume, between 0 and 1.
	* @param {boolean} [loop=false] - Whether or not the sound will loop.
	* @param {boolean} [allowFakeData=false] - If true and sound analyse is not supported, it will allow fake data generation so you can still have some visualization
	*/
	Phaser.SoundAnalyser = function (game, key, volume, loop, connect, allowFakeData) {
		
		// call base object constructor
		Phaser.Sound.call(this, game, key, volume, loop, connect);
		
		/**
		* @property {Boolean} allowFakeData - If true and sound analyse is not supported, it will allow fake data generation so you can still have some visualization
		*/
		this.allowFakeData = true;//allowFakeData === true;
		
		/**
		* @property {object} analyserNode - The analyser node in a Web Audio system, node which is able to provide real-time frequency and time-domain analysis information
		*/
		this.analyserNode = null;
		
		/**
		* @property {object} spliterNode - The splitter node in a Web Audio system, node which will separate audio data to two channels (left/right stereo)
		*/
		this.spliterNode = null;
		
		/**
		* @property {object} splitAnalyseNodeLeft - The analyser node in a Web Audio system, node which is able to provide real-time frequency and time-domain analysis information for the left channel from splitter
		*/
		this.splitAnalyseNodeLeft = null;
		
		/**
		* @property {object} splitAnalyseNodeRight - The analyser node in a Web Audio system, node which is able to provide real-time frequency and time-domain analyse information for the right channel from splitter
		*/
		this.splitAnalyseNodeRight = null;
		
		/**
		* @private
		* @property {Uint8Array<Number>} _dataArray - Array to store float frequency data
		*/
		this._dataArray = null;
		
		/**
		* @private
		* @property {Uint8Array<Number>} _dataTimeArray - Array to store time frequency data
		*/
		this._dataTimeArray = null;
		
		/**
		* @private
		* @property {Number} _bufferLength - The number of data values you will have to play with for the visualization
		*/
		this._bufferLength = 0;
		
		/**
		* @property {Array<Phaser.BitmapDataSoundAnalyze>} bmpSoundAnalyze - Array of bitmap data that will visualize audio analyse (equalizer, meter, volume)
		*/
		this.bmpSoundAnalyze = [];
		
		/**
		* @property {Phaser.Signal} onAnalyseUpdate - The onAnalyseUpdate event is dispatched when new data is analysed.
		*/
		this.onAnalyseUpdate = new Phaser.Signal();
		
		/**
		* @property {Boolean} supportAnalyse - If true then audio analyse is supported
		*/
		this.supportAnalyse = false;
		
		/**
		* @private
		* @property {Number[32..2048]} _fastFourierTransform - value representing the size of the FFT (Fast Fourier Transform) to be used to determine the frequency domain (this will be the size of the array), must be power of 2 and in range 32 to 2048
		*/
		this._fastFourierTransform = 2048;
		
		/**
		* @name Phaser.SoundAnalyser#fastFourierTransform
		* @property {Number} fastFourierTransform - value representing the size of the FFT (Fast Fourier Transform) to be used to determine the frequency domain (this will be the size of the array), must be power of 2 and in range 32 to 2048
		* @readonly
		*/
		Object.defineProperty(Phaser.SoundAnalyser.prototype, "fastFourierTransform", {

			get: function () {
				return this._fastFourierTransform;
			},
			set: function (val) {
				if (typeof val === "number" && val >= 32 && val <= 2048 && val % 2 === 0 ) {
					val = Math.round(val);
					this._fastFourierTransform = val;
					this._bufferLength = val;
					if (this.supportAnalyse) {
						this.analyserNode.fftSize = val;
					}
				} else {
					if (console.warn) {
						console.warn("Provided 'fastFourierTransform' value (" + val + ") must be in range 32..2048 and power of 2!");
					} else {
						console.log("Warning: Provided 'fastFourierTransform' value (" + val + ") must be in range 32..2048 and power of 2!");
					}
				}
			}

		});
		
		/**
		* @private
		* @property {Number} [_minDecibels=-150] - value representing the minimum power value in the scaling range for the FFT analysis data
		*/
		this._minDecibels = -150;
		
		/**
		* @name Phaser.SoundAnalyser#minDecibels
		* @property {Number} minDecibels - value representing the minimum power value in the scaling range for the FFT analysis data
		* @readonly
		*/
		Object.defineProperty(Phaser.SoundAnalyser.prototype, "minDecibels", {

			get: function () {
				return this._minDecibels;
			},
			set: function (val) {
				if (typeof val === "number") {;
					this._minDecibels = val;
					if (this.supportAnalyse) {
						this.analyserNode.minDecibels = val;
					}
				} else {
					if (console.warn) {
						console.warn("Provided 'minDecibels' value (" + val + ") must be number!");
					} else {
						console.log("Warning: Provided 'minDecibels' value (" + val + ") must be number!");
					}
				}
			}
			
		});
		
		/**
		* @private
		* @property {Number} [_maxDecibels=10] - value representing the maximum power value in the scaling range for the FFT analysis data
		*/
		this._maxDecibels = 10;
		
		/**
		* @name Phaser.SoundAnalyser#maxDecibels
		* @property {Number} maxDecibels - value representing the maximum power value in the scaling range for the FFT analysis data
		* @readonly
		*/
		Object.defineProperty(Phaser.SoundAnalyser.prototype, "maxDecibels", {

			get: function () {
				return this._maxDecibels;
			},
			set: function (val) {
				if (typeof val === "number") {;
					this._maxDecibels = val;
					if (this.supportAnalyse) {
						this.analyserNode.maxDecibels = val;
					}
				} else {
					if (console.warn) {
						console.warn("Provided 'maxDecibels' value (" + val + ") must be number!");
					} else {
						console.log("Warning: Provided 'maxDecibels' value (" + val + ") must be number!");
					}
				}
			}
			
		});
		
		// setup analyse node
		if (this.context && this.context.createAnalyser) {
			this.supportAnalyse = true;
			// create analyse node
			this.analyserNode = this.context.createAnalyser();
			// setup some default values
			this.analyserNode.fftSize = this._fastFourierTransform; // Fast Fourier Transform to be used to determine the frequency domain
			this._bufferLength = this.analyserNode.frequencyBinCount;
			this._dataArray = new Uint8Array(this._bufferLength);
			this._dataTimeArray = new Uint8Array(this._bufferLength);
			this.analyserNode.minDecibels = this._minDecibels;
			this.analyserNode.maxDecibels = this._maxDecibels;
			this.analyserNode.smoothingTimeConstant = 0.8; 
			// connect analyse node with gain node
			this.gainNode.connect(this.analyserNode);
			
			// create splitter node and left and right analysers
			if (this.context.createChannelSplitter) {
				// setup a analyser
				this.splitAnalyseNodeLeft = this.context.createAnalyser();
				this.splitAnalyseNodeLeft.smoothingTimeConstant = 0.8;
				this.splitAnalyseNodeLeft.fftSize = this._fastFourierTransform;
		 
				this.splitAnalyseNodeRight = this.context.createAnalyser();
				this.splitAnalyseNodeRight.smoothingTimeConstant = 0.8;
				this.splitAnalyseNodeRight.fftSize = this._fastFourierTransform;
				
				// create splitter
				this.spliterNode = this.context.createChannelSplitter(2);
				
				// connect one of the outputs from the splitter to the analyser
				this.gainNode.connect(this.spliterNode);
				this.spliterNode.connect(this.splitAnalyseNodeLeft, 0, 0);
				this.spliterNode.connect(this.splitAnalyseNodeRight, 1, 0);
			}
		} else if (this.allowFakeData) {
			this._bufferLength = this._fastFourierTransform;
			this._dataArray = new Uint8Array(this._bufferLength);
			this._dataTimeArray = new Uint8Array(this._bufferLength);
		}
	};
	// constructor setup
	Phaser.SoundAnalyser.prototype = Object.create(Phaser.Sound.prototype);
	Phaser.SoundAnalyser.prototype.constructor = Phaser.SoundAnalyser;

	/**
	* Called automatically by Phaser.SoundManager to update sound analyse data
	* @method Phaser.Sound#update
	* @protected
	*/
	Phaser.SoundAnalyser.prototype.update = function () {
		// call base method update
		Phaser.Sound.prototype.update.call(this);
		
		if (this.isPlaying) {
			var arrayLeft, arrayRight, volMeter;
			if (this.analyserNode) {
				// get byte frequency array data
				this.analyserNode.getByteFrequencyData(this._dataArray);
				// get byte time frequency array data
				this.analyserNode.getByteTimeDomainData(this._dataTimeArray);
				// get the average for the first channel
				var arrayLeft =  new Uint8Array(this.splitAnalyseNodeLeft.frequencyBinCount);
				this.splitAnalyseNodeLeft.getByteFrequencyData(arrayLeft);
				var averageLeft = this.getAvg(arrayLeft);
				// get the average for the second channel
				var arrayRight =  new Uint8Array(this.splitAnalyseNodeRight.frequencyBinCount);
				this.splitAnalyseNodeRight.getByteFrequencyData(arrayRight);
				var averageRight = this.getAvg(arrayRight);
				// calculate volume meter
				volMeter = this.getAvg(this._dataArray);
			} else if (this.allowFakeData) {
				var fakeData = this.getFakeData(this._bufferLength);
				this._dataArray = fakeData;
				this._dataTimeArray = fakeData;
				// get the average for the first channel
				averageLeft = this.getAvg(fakeData);
				// get the average for the second channel
				averageRight = fakeData;
				// calculate volume meter
				volMeter = fakeData;
			}
			if (this.analyserNode || this.allowFakeData) {
				// dispatch event
				this.onAnalyseUpdate.dispatch(this._dataArray, this._dataTimeArray, this._bufferLength, volMeter, averageLeft, averageRight);
				// call bitmap update if provided
				if (this.bmpSoundAnalyze.length > 0) {
					for (var k = 0; k < this.bmpSoundAnalyze.length; ++k) {
						this.bmpSoundAnalyze[k].updateAnalyse(this._dataArray, this._dataTimeArray, this._bufferLength, volMeter, averageLeft, averageRight);
					}
				}
			}
		}
	};

	/**
	* Add new bitmap sound analyse object
	*
	* @method Phaser.SoundAnalyser#addBitmapSoundAnalyse
	* @property {BitmapDataSoundAnalyze} bmp - bitmap sound analyse object to be add
	* @return {Phaser.SoundAnalyser} return self reference
	* @protected
	*/
	Phaser.SoundAnalyser.prototype.addBitmapSoundAnalyse = function (bmp) {
		this.bmpSoundAnalyze.push(bmp);
		return this;
	};

	/**
	* Remove bitmap sound analyse object
	*
	* @method Phaser.SoundAnalyser#removeBitmapSoundAnalyse
	* @property {BitmapDataSoundAnalyze} bmp - bitmap sound analyse object to be removed
	* @return {Phaser.SoundAnalyser} return self reference
	* @protected
	*/
	Phaser.SoundAnalyser.prototype.removeBitmapSoundAnalyse = function (bmp) {
		for (var k = this.bmpSoundAnalyze.length - 1; k >= 0; --k) {
			if (this.bmpSoundAnalyze[k] === bmp) {
				this.bmpSoundAnalyze.splice(k, 1);
				break;
			}
		}
		return this;
	};

	/**
	* Called automatically by Phaser.SoundManager. to get average sound meter value
	* @method Phaser.SoundAnalyser#getAvg
	* @property {Uint8Array<Number>} dataArr - array with sound frequency data
	* @return {Number} return average frequency value
	* @protected
	*/
	Phaser.SoundAnalyser.prototype.getAvg = function (dataArr) {
		var values = 0;
		var average;
		var length = dataArr.length;
		// get all the frequency amplitudes
		for (var i = 0; i < length; i++) {
			values += dataArr[i];
		}
		average = Math.floor(values / length, 10);
		return average;
	};

	/**
	 * Generate Fake frequency array data
	 * 
	 * @method Phaser.AudioSprite#getFakeData
	 * @return {Uint8Array<Number>} dataArr - array with sound frequency data
	 */
	Phaser.SoundAnalyser.prototype.getFakeData = function () {
		var res = [];
		for (var k = 0; k < this._bufferLength; ++k) {
			res.push(Math.abs(this.game.rnd.integerInRange(this._minDecibels, this._maxDecibels)));
		}
		res.sort(function(a, b){return b-a});
		return res;
	};

	/**
	 * Get re-sampled (average) audio data  
	 * 
	 * @static
	 * @method Phaser.AudioSprite#getAvgData
	 * @param {Uint8Array<Number>} dataArr - array with sound frequency data
	 * @param {number} - bufferLength - the size of the frequency data
	 * @param {number} - resultSlots - number of result slots you want
	 * @param {number} - maxMinValue - input minimal value used for calculating data
	 * @param {number} - outMaxValue - maximum result value for every frequency data
	 * @return {Uint8Array<Number>} dataArr - array with re-sampled (averaged) sound frequency data
	 */
	Phaser.SoundAnalyser.getAvgData = function (dataArray, bufferLength, resultSlots, maxMinValue, outMaxValue) {
		normalizeValue = normalizeValue || 256;
		var value, percent, height, offset, barWidth, hue, avg;
		var res = [];
		if (bufferLength == resultSlots) {
			barWidth = this.width / bufferLength;
			for (var i = 0; i < bufferLength; i++) {
				value = dataArray[i];
				percent = value / maxMinValue;
				size = Math.floor(outMaxValue * percent, 10);
				res.push(size);
			}
		} else {
			var destBars = resultSlots;
			var destPart = Math.round(bufferLength / destBars);
				barWidth = this.width / destBars;
			
			var i = 0;
			for (var x = 0; x < destBars; x++) {
				avg = 0;
				for (var k = 0; k < destPart; ++k, ++i) {
					if (i >= bufferLength) { break; }
					avg += dataArray[i];
				}
				avg = Math.floor(avg / destPart, 10);
				value = avg;
				percent = value / maxMinValue;
				size = Math.floor(outMaxValue * percent, 10);
				res.push(size);
				
				if (i >= bufferLength) { break; }
			}
			if (i < bufferLength) {
				x++;
				avg = 0;
				for (; i < bufferLength; ++i) {
					avg += dataArray[i];
				}
				avg = Math.floor(avg / destPart, 10);
				value = avg;
				percent = value / maxMinValue;
				size = Math.floor(outMaxValue * percent, 10);
				res.push(size);
			}
		}
		return res;
	};

	/**
	 * iterate and callback for every re-sampled (averaged) slot data
	 * 
	 * @static
	 * @method Phaser.AudioSprite#eachAvgData
	 * @param {Uint8Array<Number>} dataArr - array with sound frequency data
	 * @param {number} - bufferLength - the size of the frequency data
	 * @param {number} - resultSlots - number of result slots you want
	 * @param {number} - maxMinValue - input minimal value used for calculating data
	 * @param {number} - outMaxValue - maximum result value for every frequency data
	 * @param {Function} - callback - callback function
	 * @param {context} - callback - context to be provided in callback function
	 * @return {Uint8Array<Number>} dataArr - array with re-sampled (averaged) sound frequency data
	 */
	Phaser.SoundAnalyser.eachAvgData = function (dataArray, bufferLength, resultSlots, maxMinValue, outMaxValue, callback, context) {
		maxMinValue = maxMinValue || 256;
		outMaxValue = outMaxValue || maxMinValue;
		var value, percent, height, offset, barWidth, hue, avg;
		var res = [];
		if (bufferLength == resultSlots) {
			barWidth = this.width / bufferLength;
			for (var i = 0; i < bufferLength; i++) {
				value = dataArray[i];
				percent = value / maxMinValue;
				size = Math.floor(outMaxValue * percent, 10);
				if (callback) {
					callback.call(context, size, percent, i, i);
				}
			}
		} else {
			var destBars = resultSlots;
			var destPart = Math.round(bufferLength / destBars);
				barWidth = this.width / destBars;
			
			var i = 0;
			for (var x = 0; x < destBars; x++) {
				avg = 0;
				for (var k = 0; k < destPart; ++k, ++i) {
					if (i >= bufferLength) { break; }
					avg += dataArray[i];
				}
				avg = Math.floor(avg / destPart, 10);
				value = avg;
				percent = value / maxMinValue;
				size = Math.floor(outMaxValue * percent, 10);
				if (callback) {
					callback.call(context, size, percent, x, i);
				}
				if (i >= bufferLength) { break; }
			}
			if (i < bufferLength) {
				x++;
				avg = 0;
				for (; i < bufferLength; ++i) {
					avg += dataArray[i];
				}
				avg = Math.floor(avg / destPart, 10);
				value = avg;
				percent = value / maxMinValue;
				size = Math.floor(outMaxValue * percent, 10);
				if (callback) {
					callback.call(context, size, percent, x, i);
				}
			}
		}
		return res;
	};





	/** --- BITMAP DATA SOUND ANALYSE --- **/

	/**
	* A BitmapData object contains a Canvas element to which you can draw anything you like via normal Canvas context operations.
	* A single BitmapData can be used as the texture for one or many Images/Sprites. 
	* So if you need to dynamically create a Sprite texture then they are a good choice.
	*
	* We use this BitmapData to draw our audio analyse data
	*
	* @class Phaser.BitmapDataSoundAnalyze
	* @extends Phaser.BitmapData
	* @constructor
	* @param {Phaser.Game} game - A reference to the currently running game.
	* @param {string} key - Internal Phaser reference key for the BitmapData.
	* @param {number} [width=256] - The width of the BitmapData in pixels. If undefined or zero it's set to a default value.
	* @param {number} [height=256] - The height of the BitmapData in pixels. If undefined or zero it's set to a default value.
	* @param {Phaser.SoundAnalyser} [soundAnalyser=null] - The SoundAnalyser object that will provide data to this bitmap
	*/
	Phaser.BitmapDataSoundAnalyze = function (game, key, width, height, soundAnalyser) {
		
		// call base object constructor
		Phaser.BitmapData.call(this, game, key, width, height);
		
		/**
		* @property {Number|def:1024} frequencyDomainChartBars - Number of bars to be drawn
		*/
		this.frequencyDomainChartBars = 1024;
		
		/**
		* @property {Boolean} drawFrequencyDomainChart - If true it will draw frequency domain chart (vertical sound bars)
		*/
		this.drawFrequencyDomainChart = true;
		
		/**
		* @property {Boolean} drawTimeDomainChart - If true it will draw frequency time domain chart (horizontal sound line)
		*/
		this.drawTimeDomainChart = false;
		
		/**
		* @property {Boolean} drawFrequencyDomainChartUniform - If true it will draw frequency time domain chart in uniformed distribution of the magnitude
		*/
		this.drawFrequencyDomainChartUniform = false;
		
		/**
		* @property {Boolean} drawFrequencyDomainChartUniformMirror - If true it will draw frequency time domain chart in uniformed distribution of the magnitude with mirror effect
		*/
		this.drawFrequencyDomainChartUniformMirror = false;
		
		/**
		* @property {Boolean} drawTimeDomainChart - If true it will draw volume meter bar
		*/
		this.drawVolumeMetar = false;
		
		/**
		* @property {Boolean} drawVolumeMetarLeftRight - If true it will draw two stereo volume meter bars
		*/
		this.drawVolumeMetarLeftRight = false;
		
		/**
		* @property {Boolean} drawBackgroundVolume - If true it will draw background volume meter gradient
		*/
		this.drawBackgroundVolume = false;
		
		/**
		* @property {Boolean} drawBackgroundData - If true it will draw background meter gradient with data interpolated into colors provided (number of colors will represent number of data/gradient step)
		*/
		this.drawBackgroundData = false;
		
		/**
		* @property {Object} backgroundVolumeColorRange - minimum color object for background amplitude animation
		* Object structure (example): 
		*	{
		*		color: { hex: "#ee3a3a", r: 238, g: 58, b: 58 },
		*		min: { hex: "#F21313", r: 242, g: 19, b: 19 },
		*		max: { hex: "#DB5A5A", r: 219, g: 90, b: 90 }
		*	}
		*/
		this.backgroundVolumeColorRange = {
			color: { hex: "#B0E4F5", r: 176, g: 228, b: 245 },
			min: { hex: "#C2F5B0", r: 195, g: 245, b: 176 },
			max: { hex: "#E3B0F5", r: 227, g: 176, b: 245 },
		};
		
		/**
		* @property {Array<Object>} backgroundDataColorRange - array of color objects that will represent audio data
		* Object structure (example): 
		*	{
		*		color: { hex: "#ee3a3a", r: 238, g: 58, b: 58 },
		*		min: { hex: "#F21313", r: 242, g: 19, b: 19 },
		*		max: { hex: "#DB5A5A", r: 219, g: 90, b: 90 }
		*	}
		*/
		this.backgroundDataColorRange = [
			{
				color: { hex: "#30d2b9", r: 48, g: 210, b: 185 },
				min: { hex: "#02F7D2", r: 2, g: 247, b: 210 },
				max: { hex: "#53968C", r: 83, g: 150, b: 140 },
			},
			{
				color: { hex: "#ee3a3a", r: 238, g: 58, b: 58 },
				min: { hex: "#F21313", r: 242, g: 19, b: 19 },
				max: { hex: "#DB5A5A", r: 219, g: 90, b: 90 },	
			},
			{
				color: { hex: "#793aee", r: 121, g: 58, b: 238 },
				min: { hex: "#6011F2", r: 96, g: 17, b: 242 },
				max: { hex: "#966EE0", r: 150, g: 110, b: 224 },
			},
			{
				color: { hex: "#30d2b9", r: 48, g: 210, b: 185 },
				min: { hex: "#02F7D2", r: 2, g: 247, b: 210 },
				max: { hex: "#53968C", r: 83, g: 150, b: 140 },
			},
		];
		
		/**
		* @property {Number} backgroundAlpha - alpha value for background in range from 0 to 1
		*/
		this.backgroundAlpha = 1;
		
		/**
		* @property {Number} backgroundAlpha - alpha value for background in range from 0 to 1
		*/
		this.backgroundTweening = null;
		
		/**
		* @property {String|Hex} timeChartColor - color for time domain chart (you can use any web supported format)
		*/
		this.timeChartColor = "#0000ff";
		
		/**
		* @property {String|Hex} volumeMetarColor - color for the volume meter
		*/
		this.volumeMetarColor = "#FFAA00";
		
		/**
		* @property {String|Hex} volumeMetarLeftColor - color for the left volume meter
		*/
		this.volumeMetarLeftColor = "#FFAA00";
		
		/**
		* @property {String|Hex} volumeMetarRightColor - color for the right volume meter
		*/
		this.volumeMetarRightColor = "#FFAA33";
		
		/**
		* @property {String|Hex} [frequencyDomainChartUniformColor="#FFAA33"] - color for the frequency domain chart uniform
		*/
		this.frequencyDomainChartUniformColor = "#FFAA33";
		
		// set reference to sound analyser object
		this.soundAnalyser = soundAnalyser;
		
		// add sound analyse bitmap to sound analyse object if provided
		if (this.soundAnalyser) {
			this.soundAnalyser.addBitmapSoundAnalyse(this);
		}
		
	};
	// constructor setup
	Phaser.BitmapDataSoundAnalyze.prototype = Object.create(Phaser.BitmapData.prototype);
	Phaser.BitmapDataSoundAnalyze.prototype.constructor = Phaser.BitmapDataSoundAnalyze;

	/**
	* Called automatically by Phaser.BitmapDataSoundAnalyze. to get transformed value
	*
	* @method Phaser.BitmapDataSoundAnalyze#linearCut
	* @property {Number} inVal - value we want to transform
	* @property {Number} inMin - minimum input range for the inVal
	* @property {Number} inMax - maximum input range for the inVal
	* @property {Number} inMin - minimum output range for the inVal
	* @property {Number} inMax - maximum output range for the inVal
	* @return {Number} return inVal number in range [outMin..outMax]
	*/
	Phaser.BitmapDataSoundAnalyze.prototype.linearCut = function (inVal, inMin, inMax, outMin, outMax) {
		var res = (inVal - inMin) / (inMax - inMin) * (outMax - outMin) + outMin;
		if (res < outMin) {
			res = outMin
		} else if (res > outMax) {
			res = outMax;
		}
		return Math.floor(res);
	};

	/**
	* Method to tween bitmap sound analyse background from current background color to the one provided
	*
	* @method Phaser.BitmapDataSoundAnalyze#linearCut
	* @property {Number} endColorVal - tint color values
	* @property {Number} time - animation time duration in milliseconds
	* @property {Function} callBack - method to be called on finish animation
	* @property {Object} context - context object to be provided in callback method
	* @return {Phaser.BitmapDataSoundAnalyze} return self reference
	*/
	Phaser.BitmapDataSoundAnalyze.prototype.tweenBackground = function (endColorVal, time, callBack, context) {
		
		if (this.backgroundTweening) {
			this.backgroundTweening.stop();
			this.game.tweens.remove(this.backgroundTweening);
		}
		
		this.backgroundTweening = null;
		
		var self = this;
		var startColor = Phaser.Color.getColor32(this.backgroundAlpha, this.backgroundVolumeColorRange.color.r, 
			this.backgroundVolumeColorRange.color.g, this.backgroundVolumeColorRange.color.b);
		this.backgroundVolumeColorRange = endColorVal;
		var endColor = Phaser.Color.getColor32(this.backgroundAlpha, endColorVal.color.r, 
			endColorVal.color.g, endColorVal.color.b);
		
		// create an object to tween with our step value at 0
		var colorBlend = {step: 0};

		// create the tween on this object and tween its step property to 100
		this.backgroundTweening = this.game.add.tween(colorBlend).to({step: 100}, time);
		
		// run the interpolateColor function every time the tween updates, feeding it the
		// updated value of our tween each time, and set the result as our tint
		this.backgroundTweening.onUpdateCallback(function() {
			var col = Phaser.Color.valueToColor(Phaser.Color.interpolateColor(startColor, endColor, 100, colorBlend.step)); 
			self.clear();
			self.ctx.save();
			self.ctx.fillStyle = "rgba(" + col.r + ", " + col.g + ", " +
				col.b + ", " + self.backgroundAlpha + ")";
			self.ctx.fillRect(0, 0, self.width, self.height);
			self.ctx.restore(); 
		});
		this.backgroundTweening.onComplete.addOnce(function () {
			self.clear();
			self.ctx.save();
			self.ctx.fillStyle = "rgba(" + endColorVal.color.r + ", " + endColorVal.color.g + ", " +
				endColorVal.color.b + ", " + self.backgroundAlpha + ")";
			self.ctx.fillRect(0, 0, self.width, self.height);
			self.ctx.restore(); 
			self.game.tweens.remove(self.backgroundTweening);
			self.backgroundTweening = null;
			if (callBack) { callBack.call(context); }
		}, this);    
		
		// start the tween
		this.backgroundTweening.start();
		
		return this;
	};


	/**
	* Method called to update it draw state every time we have new analyse data
	*
	* @method Phaser.BitmapDataSoundAnalyze#linearCut
	* @param {Uint8Array<Number>} dataArr - array with sound frequency data
	* @param {Uint8Array<Number>} dataTimeArray - array with sound time frequency data
	* @param {number} - bufferLength - the size of the frequency data
	* @param {number} - volumeMeter - sound volume meter value
	* @param {number} - volumeMeterLeft - sound volume meter value for the left stereo sound
	* @param {number} - volumeMeterRight - sound volume meter value for the right stereo sound
	* @return {Phaser.BitmapDataSoundAnalyze} return self reference
	* @protected
	*/
	Phaser.BitmapDataSoundAnalyze.prototype.updateAnalyse = function (dataArray, dataTimeArray, bufferLength, volumeMeter, volumeMeterLeft, volumeMeterRight) {
			
		this.clear();
		
		if (this.backgroundVolumeColorRange && this.backgroundVolumeColorRange["color"]) {
			this.ctx.save();
			this.ctx.fillStyle = "rgba(" + this.backgroundVolumeColorRange["color"].r + ", " + 
				this.backgroundVolumeColorRange["color"].g + ", " + this.backgroundVolumeColorRange["color"].b + 
				", " + this.backgroundAlpha + ")";
			this.ctx.fillRect(0, 0, this.width, this.height);
			this.ctx.restore();
		}
		
		if (!dataArray && !dataTimeArray && !bufferLength && !volumeMeter && !volumeMeterLeft && !volumeMeterRight) {
			return this;
		}
		
		var width = Math.floor(1 / bufferLength, 10);
		var value, percent, height, offset, barWidth, hue, avg;
		
		if (this.drawBackgroundVolume && this.backgroundVolumeColorRange["min"] && this.backgroundVolumeColorRange["max"]) {		
			this.ctx.save();
			var grd = this.ctx.createLinearGradient(0, 0, this.width, 0);
			
			var minR = Math.min(this.backgroundVolumeColorRange["min"].r, this.backgroundVolumeColorRange["max"].r);
			var maxR = Math.max(this.backgroundVolumeColorRange["min"].r, this.backgroundVolumeColorRange["max"].r);
			var minG = Math.min(this.backgroundVolumeColorRange["min"].g, this.backgroundVolumeColorRange["max"].g);
			var maxG = Math.max(this.backgroundVolumeColorRange["min"].g, this.backgroundVolumeColorRange["max"].g);
			var minB = Math.min(this.backgroundVolumeColorRange["min"].b, this.backgroundVolumeColorRange["max"].b);
			var maxB = Math.max(this.backgroundVolumeColorRange["min"].b, this.backgroundVolumeColorRange["max"].b);
			var r, g, b;

			percent = volumeMeterLeft / 256;
			height = Math.floor(255 * percent, 10);
			r = this.linearCut(height, 0, 255, minR, maxR);
			g = this.linearCut(height, 0, 255, minG, maxG);
			b = this.linearCut(height, 0, 255, minB, maxB);
			grd.addColorStop(0, "rgba(" + r + ", " + g + ", " + b + ", " + this.backgroundAlpha + ")");
			
			percent = volumeMeter / 256;
			height = Math.floor(255 * percent, 10);
			r = this.linearCut(height, 0, 255, minR, maxR);
			g = this.linearCut(height, 0, 255, minG, maxG);
			b = this.linearCut(height, 0, 255, minB, maxB);
			grd.addColorStop(0, "rgba(" + r + ", " + g + ", " + b + ", " + this.backgroundAlpha + ")");
			
			percent = volumeMeterRight / 256;
			height = Math.floor(255 * percent, 10);
			r = this.linearCut(height, 0, 255, minR, maxR);
			g = this.linearCut(height, 0, 255, minG, maxG);
			b = this.linearCut(height, 0, 255, minB, maxB);
			grd.addColorStop(0, "rgba(" + r + ", " + g + ", " + b + ", " + this.backgroundAlpha + ")");
			
			this.ctx.fillStyle = grd;
			this.ctx.fillRect(0, 0, this.width, this.height);
			this.ctx.restore();
		} else if (this.drawBackgroundData) {
			var minR, maxR, minG, maxG, minB, maxB, r, g, b, colorData;
			var grd = this.ctx.createLinearGradient(0, 0, this.width, 0);
			var steps = this.backgroundDataColorRange.length;
			this.ctx.save();
			Phaser.SoundAnalyser.eachAvgData(dataArray, bufferLength, steps, 255, 255,
				function (size, percent, indexBar, globalIndex) {
					if (indexBar >= steps) return;
					colorData = this.backgroundDataColorRange[indexBar];
					minR = Math.min((colorData["min"].r || 0), (colorData["max"].r || 255));
					maxR = Math.max((colorData["min"].r || 0), (colorData["max"].r || 255));
					minG = Math.min((colorData["min"].g || 0), (colorData["max"].g || 255));
					maxG = Math.max((colorData["min"].g || 0), (colorData["max"].g || 255));
					minB = Math.min((colorData["min"].b || 0), (colorData["max"].b || 255));
					maxB = Math.max((colorData["min"].b || 0), (colorData["max"].b || 255));
					r = this.linearCut(size, 0, 255, minR, maxR);
					g = this.linearCut(size, 0, 255, minG, maxG);
					b = this.linearCut(size, 0, 255, minB, maxB);
					step = indexBar / steps;
					grd.addColorStop(step, "rgba(" + r + ", " + g + ", " + b + ", " + this.backgroundAlpha + ")");
				}, 
			this);
			this.ctx.fillStyle = grd;
			this.ctx.fillRect(0, 0, this.width, this.height);
			this.ctx.restore();
		}
		
		if (this.drawFrequencyDomainChart) {
			this.ctx.save();
			if (this.frequencyChartColor) {
				this.ctx.fillStyle = this.frequencyChartColor;
			}	
			var height, offset, hue;
			var destBars = this.frequencyDomainChartBars;
			var destPart = Math.round(bufferLength / destBars);
				barWidth = this.width / destBars;
			Phaser.SoundAnalyser.eachAvgData(dataArray, bufferLength, this.frequencyDomainChartBars, 256, this.height,
				function (size, percent, indexBar, globalIndex) {
					height = this.height * percent;
					offset = this.height - height - 1;
					if (!this.frequencyChartColor) {
						hue = indexBar / destBars * 360;
						this.ctx.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
					}
					this.ctx.fillRect(indexBar * barWidth, offset, barWidth, height);	
				}, 
			this);
			this.ctx.restore();
		}
		
		if (this.drawFrequencyDomainChartUniform) {
			var SPACER_WIDTH = 10;
			var BAR_WIDTH = 5;
			var OFFSET = Math.round(this.height / 3);
			var CUTOFF = 23;
			var numBars = Math.round(this.width / SPACER_WIDTH);
			this.ctx.save();
			this.ctx.lineCap = 'round';
			for (var i = 1; i < numBars-1; ++i) {
				var magnitude;
				if (this.height < 300) {
					magnitude = this.height - dataArray[i + OFFSET];
				} else {
					magnitude = dataArray[i + OFFSET];
				}
				this.ctx.fillStyle = this.frequencyDomainChartUniformColor;
				if (this.drawFrequencyDomainChartUniformMirror) {
					if (this.height < 150) {
						this.ctx.globalAlpha = 1;
						this.ctx.fillRect(i * SPACER_WIDTH, this.height / 2, BAR_WIDTH, magnitude);
						this.ctx.globalAlpha = 0.5;
						this.ctx.fillRect(i * SPACER_WIDTH, this.height / 2, BAR_WIDTH, -magnitude);
					} else {
						this.ctx.globalAlpha = 1;
						this.ctx.fillRect(i * SPACER_WIDTH, this.height / 2, BAR_WIDTH, -magnitude);
						this.ctx.globalAlpha = 0.5;
						this.ctx.fillRect(i * SPACER_WIDTH, this.height / 2, BAR_WIDTH, magnitude);
					}
				} else {
					this.ctx.fillRect(i * SPACER_WIDTH, this.height / 2 + magnitude / 2, BAR_WIDTH, -magnitude);
				}
			}
			this.ctx.restore();
		}
		
		if (this.drawTimeDomainChart) {
			this.ctx.save();
			this.ctx.strokeStyle = this.timeChartColor;
			this.ctx.lineWidth = 2;
			this.ctx.beginPath();
			for (var i = 0; i < bufferLength; i++) {
				value = dataTimeArray[i];
				percent = value / 256;
				height = (this.height * percent) / 2;
				offset = 2 * height;
				barWidth = this.width / bufferLength;
				if(i === 0) {
				  this.ctx.moveTo(i * barWidth, offset);
				} else {
				  this.ctx.lineTo(i * barWidth, offset);
				}
			}
			this.ctx.lineTo(this.width, this.height / 2);
			this.ctx.stroke();
			this.ctx.restore();
		}
		
		if (this.drawVolumeMetar) {
			this.ctx.save();
			this.ctx.fillStyle = this.volumeMetarColor;
			width = 20;
			percent = volumeMeter / 256;
			height = this.height * percent;
			this.ctx.fillRect(this.width/2-width/2, this.height-height, width, height);
			this.ctx.restore();
		}
		
		if (this.drawVolumeMetarLeftRight) {
			this.ctx.save();
			width = 20; offset = 30 + width;
			this.ctx.fillStyle = this.volumeMetarLeftColor;
			percent = volumeMeterLeft / 256;
			height = this.height * percent;
			this.ctx.fillRect(this.width/2-width/2-offset, this.height-height, width, height);
			this.ctx.fillStyle = this.volumeMetarRightColor;
			percent = volumeMeterRight / 256;
			height = this.height * percent;
			this.ctx.fillRect(this.width/2-width/2, this.height-height, width, height);
			this.ctx.restore();
		}
		
		return this;
		
	};



	/**
	* Sprites are the lifeblood of your game, used for nearly everything visual.
	*
	* At its most basic a Sprite consists of a set of coordinates and a texture that is rendered to the canvas.
	* They also contain additional properties allowing for physics motion (via Sprite.body), input handling (via Sprite.input),
	* events (via Sprite.events), animation (via Sprite.animations), camera culling and more. Please see the Examples for use cases.
	*
	* This sprite will hold our visual sound analyse data object, it will represent visual texture and will
	* hold direct link to some audio analyse properties
	*
	* @class Phaser.SoundAnalyseSprite
	* @extends Phaser.Sprite
	* @constructor
	* @param {Phaser.Game} game - A reference to the currently running game.
	* @param {number} [x=0] - The x coordinate of the sprite. The coordinate is relative to any parent container this sprite may be in.
	* @param {number} [y=0] - The y coordinate of the sprite. The coordinate is relative to any parent container this sprite may be in.
	* @param {number} [width=game.width] - The width of the sprite
	* @param {number} [height=game.height] - The height of the sprite
	* @param {number} songKey - The key value for the song
	* @param {Boolean} autoPlay - if true song will start playing automatically
	* @param {Function} onDecodeComplete - method callback on sound decoding complete
	* @param {Object} context - context object to be provided in callback method
	* @param {Phaser.group} group - group object to add this sprite
	*/
	Phaser.SoundAnalyseSprite = function (game, x, y, width, height, songKey, autoPlay, onDecodeComplete, context, group) {
		
		width = width || game.width;
		height = height || game.height;
		
		// create sound analyse object
		this.songAnalyse = new Phaser.SoundAnalyser(game, songKey, 1, false);
		game.sound._sounds.push(this.songAnalyse);
		
		// bitmap analyse texture
		this.bmpAnalyseTexture = new Phaser.BitmapDataSoundAnalyze(game, game.rnd.uuid(), width, height, this.songAnalyse);

		//  We call the Phaser.Sprite passing in the game reference
		Phaser.Sprite.call(this, game, x, y, this.bmpAnalyseTexture);

		// add sprite to game word
		if (group) {
			group.add(this);
		} else {
			game.add.existing(this);
		}
		
		// if auto play is true, then start the song
		if (autoPlay === true) {
			this.songAnalyse.play();
		}
		
		this.songAnalyse.onDecoded.addOnce(function () {
			// call provided callback method
			if (onDecodeComplete) {
				onDecodeComplete.call(context, this);
			}
		}, this);
		
		// set link-reference to main properties
		this.usingWebAudio = this.songAnalyse.usingWebAudio;
		// reference to self
		var _this = this;
		// set link to main methods
		this.play = function (marker, position, volume, loop, forceRestart) { _this.songAnalyse.play(marker, position, volume, loop, forceRestart); };
		this.pause = function () { _this.songAnalyse.pause(); };
		this.stop = function () { _this.songAnalyse.stop(); };
		this.resume = function () { _this.songAnalyse.resume(); };
		this.restart = function (marker, position, volume, loop) { _this.songAnalyse.restart(marker, position, volume, loop); };
		this.fadeIn = function (duration, loop, marker) { _this.songAnalyse.fadeIn(duration, loop, marker); };
		this.fadeOut = function (duration) { _this.songAnalyse.fadeOut(duration); };
		this.fadeTo = function (duration, volume) { _this.songAnalyse.fadeTo(duration, volume); };
		this.loopFull = function (volume) { _this.songAnalyse.loopFull(volume); };
		this.addMarker = function (name, start, duration, volume, loop) { _this.songAnalyse.addMarker(name, start, duration, volume, loop); };
		this.removeMarker = function (name) { _this.songAnalyse.removeMarker(name); };
		// set link-reference to event methods
		this.onPlay = this.songAnalyse.onPlay;
		this.onResume = this.songAnalyse.onResume;
		this.onStop = this.songAnalyse.onStop;
		this.onPause = this.songAnalyse.onPause;
		this.onMute = this.songAnalyse.onMute;
		this.onLoop = this.songAnalyse.onLoop;
		this.onFadeComplete = this.songAnalyse.onFadeComplete;
	};
	// constructor setup
	Phaser.SoundAnalyseSprite.prototype = Object.create(Phaser.Sprite.prototype);
	Phaser.SoundAnalyseSprite.prototype.constructor = Phaser.SoundAnalyseSprite;

	/**
	* Resize sprite and bitmap sound
	*
	* @method Phaser.BitmapDataSoundAnalyze#resize
	* @property {Number} w - new width for the sprite
	* @property {Number} h - new height for the sprite
	*/
	Phaser.SoundAnalyseSprite.prototype.resize = function (w, h) {
		w = w || this.width;
		h = h || this.height;
		this.bmpAnalyseTexture.clear();
		this.bmpAnalyseTexture.resize(w, h);
		this.width = w;
		this.height = h;
	};

	/**
	* Is this sound paused
	*
	* @method Phaser.SoundAnalyseSprite#isPaused
	* @return {Number} return true if sound is paused
	*/
	Phaser.SoundAnalyseSprite.prototype.isPaused = function () {
		return this.songAnalyse.paused;
	};

	/**
	* Is this sound playing
	*
	* @method Phaser.SoundAnalyseSprite#isPlaying
	* @return {Number} return true if sound is playing
	*/
	Phaser.SoundAnalyseSprite.prototype.isPlaying = function () {
		return this.songAnalyse.isPlaying;
	};

	/**
	* Is this sound looping
	*
	* @method Phaser.SoundAnalyseSprite#isLooping
	* @return {Number} return true if sound is looping
	*/
	Phaser.SoundAnalyseSprite.prototype.isLooping = function () {
		return this.songAnalyse.loop;
	};

	/**
	* Is this sound decoded
	*
	* @method Phaser.SoundAnalyseSprite#isDecoded
	* @return {Number} return true if sound is decoded
	*/
	Phaser.SoundAnalyseSprite.prototype.isDecoded = function () {
		return this.songAnalyse.isDecoded;
	};

	/**
	* Is this sound still decoding
	*
	* @method Phaser.SoundAnalyseSprite#isDecoding
	* @return {Number} return true if sound is still decoding
	*/
	Phaser.SoundAnalyseSprite.prototype.isDecoding = function () {
		return this.songAnalyse.isDecoding;
	};

	/**
	* Is this sound muted
	*
	* @method Phaser.SoundAnalyseSprite#isMuted
	* @return {Number} return true if sound is still muted
	*/
	Phaser.SoundAnalyseSprite.prototype.isMuted = function () {
		return this.songAnalyse.mute;
	};

	/**
	* Set sound mute state
	*
	* @method Phaser.SoundAnalyseSprite#setMute
	* @param {Number} val - set true to mute sound or false to resume sound volume
	*/
	Phaser.SoundAnalyseSprite.prototype.setMute = function (val) {
		this.songAnalyse.mute = val === true;
	};

	/**
	* Get sound duration value
	*
	* @method Phaser.SoundAnalyseSprite#duration
	* @return {Number} return sound duration value
	*/
	Phaser.SoundAnalyseSprite.prototype.duration = function () {
		return this.songAnalyse.duration;
	};

	/**
	* Get sound total Duration value
	*
	* @method Phaser.SoundAnalyseSprite#totalDuration
	* @return {Number} return sound total Duration value
	*/
	Phaser.SoundAnalyseSprite.prototype.totalDuration = function () {
		return this.songAnalyse.totalDuration;
	};

	/**
	* Get sound current Time value
	*
	* @method Phaser.SoundAnalyseSprite#totalDuration
	* @return {Number} return sound current Time value
	*/
	Phaser.SoundAnalyseSprite.prototype.currentTime = function () {
		return this.songAnalyse.currentTime;
	};

	/**
	* Get sound current position value
	*
	* @method Phaser.SoundAnalyseSprite#position
	* @return {Number} return sound current position value
	*/
	Phaser.SoundAnalyseSprite.prototype.position = function () {
		return this.songAnalyse.position;
	};

	/**
	* Get sound current volume value
	*
	* @method Phaser.SoundAnalyseSprite#volume
	* @return {Number} return sound current volume value
	*/
	Phaser.SoundAnalyseSprite.prototype.volume = function () {
		return this.songAnalyse.volume;
	};

	/**
	* If will show or hide frequency domain chart bars
	*
	* @method Phaser.SoundAnalyseSprite#showFrequencyDomainChartBars
	* @param {boolean} [val=true] - If true frequency domain chart bars will be visible
	* @return {Phaser.SoundAnalyseSprite} return self reference
	*/
	Phaser.SoundAnalyseSprite.prototype.showFrequencyDomainChartBars = function (val) {
	   this.bmpAnalyseTexture.drawFrequencyDomainChart = val === true;
	   return this;
	};

	/**
	* If will show or hide time frequency domain chart
	*
	* @method Phaser.SoundAnalyseSprite#showTimeDomainChart
	* @param {boolean} [val=true] - If true time frequency domain chart will be visible
	* @return {Phaser.SoundAnalyseSprite} return self reference
	*/
	Phaser.SoundAnalyseSprite.prototype.showTimeDomainChart = function (val) {
	   this.bmpAnalyseTexture.drawTimeDomainChart = val === true;
	   return this;
	};

	/**
	* If will show or hide  frequency domain chart uniform
	*
	* @method Phaser.SoundAnalyseSprite#showFrequencyDomainChartUniform
	* @param {boolean} [val=true] - If true time frequency domain chart will be visible
	* @return {Phaser.SoundAnalyseSprite} return self reference
	*/
	Phaser.SoundAnalyseSprite.prototype.showFrequencyDomainChartUniform = function (val) {
	   this.bmpAnalyseTexture.drawFrequencyDomainChartUniform = val === true;
	   return this;
	};

	/**
	* If will show or hide  frequency domain chart uniform with mirror effect
	*
	* @method Phaser.SoundAnalyseSprite#showFrequencyDomainChartUniformMirror
	* @param {boolean} [val=true] - If true time frequency domain chart uniform will be enabled
	* @return {Phaser.SoundAnalyseSprite} return self reference
	*/
	Phaser.SoundAnalyseSprite.prototype.showFrequencyDomainChartUniformMirror = function (val) {
	   this.bmpAnalyseTexture.drawFrequencyDomainChartUniformMirror = val === true;
	   return this;
	};

	/**
	* If will show or hide  volume metar
	*
	* @method Phaser.SoundAnalyseSprite#showVolumeMetar
	* @param {boolean} [val=true] - If true volume meter vill be shown
	* @return {Phaser.SoundAnalyseSprite} return self reference
	*/
	Phaser.SoundAnalyseSprite.prototype.showVolumeMetar = function (val) {
	   this.bmpAnalyseTexture.drawVolumeMetar = val === true;
	   return this;
	};

	/**
	* If will show or hide  stereo volume metar
	*
	* @method Phaser.SoundAnalyseSprite#showVolumeMetarLeftRight
	* @param {boolean} [val=true] - If true stereo volume meter vill be shown
	* @return {Phaser.SoundAnalyseSprite} return self reference
	*/
	Phaser.SoundAnalyseSprite.prototype.showVolumeMetarLeftRight = function (val) {
	   this.bmpAnalyseTexture.drawVolumeMetarLeftRight = val === true;
	   return this;
	};

	/**
	* If will show or hide  background volume (it will change background color by the volume value)
	*
	* @method Phaser.SoundAnalyseSprite#showBackgroundVolume
	* @param {boolean} [val=true] - If true background volume will be shown
	* @return {Phaser.SoundAnalyseSprite} return self reference
	*/
	Phaser.SoundAnalyseSprite.prototype.showBackgroundVolume = function (val) {
	   this.bmpAnalyseTexture.drawBackgroundVolume = val === true;
	   return this;
	};

	/**
	* If will show or hide  background gradiend data (it will change gradient colors by frequency chart data)
	*
	* @method Phaser.SoundAnalyseSprite#showBackgroundVolume
	* @param {boolean} [val=true] - If true background gradiend volume will be shown
	* @return {Phaser.SoundAnalyseSprite} return self reference
	*/
	Phaser.SoundAnalyseSprite.prototype.showBackgroundData = function (val) {
	   this.bmpAnalyseTexture.drawBackgroundData = val === true;
	   return this;
	};

	/**
	* Destroys this sound analyse sprite and all associated events and removes it from the SoundManager.
	*
	* @method Phaser.SoundAnalyseSprite#destroy
	* @param {boolean} [remove=true] - If true all referenced object will be removed from managers and cache
	*/
	Phaser.SoundAnalyseSprite.prototype.destroy = function (remove) {
		remove = remove || true;
		
		this.songAnalyse.removeBitmapSoundAnalyse(this);
		
		Phaser.Sprite.prototype.destroy.call(this, remove);
		
		this.songAnalyse.destroy(remove);
		this.songAnalyse = null;
		this.bmpAnalyseTexture.destroy(remove);
		this.bmpAnalyseTexture = null;
	};





	/**
	 * Audio Analyse Sprites are a combination of audio analyse files and a JSON configuration.
	 * The JSON follows the format of that created by https://github.com/tonistiigi/audiosprite
	 *
	 * @class Phaser.AudioAnalyseSprite
	 * @constructor
	 * @param {Phaser.Game} game - Reference to the current game instance.
	 * @param {string} key - Asset key for the sound.* @param {number} [x=0] - The x coordinate of the sprite. The coordinate is relative to any parent container this sprite may be in.
	 * @param {number} [y=0] - The y coordinate of the sprite. The coordinate is relative to any parent container this sprite may be in.
	 * @param {number} [width=game.width] - The width of the sprite
	 * @param {number} [height=game.height] - The height of the sprite
	 */
	Phaser.AudioAnalyseSprite = function (game, key, x, y, width, height) {
		x = x || 0;
		y = y || 0;
		width = width || game.width;
		height = height || game.height;
		
		/**
		* A reference to the currently running Game.
		* @property {Phaser.Game} game
		*/
		this.game = game;

		/**
		 * Asset key for the Audio Sprite.
		 * @property {string} key
		 */
		this.key = key;

		/**
		 * JSON audio atlas object.
		 * @property {object} config
		 */
		this.config = this.game.cache.getJSON(key + '-audioatlas');

		/**
		 * If a sound is set to auto play, this holds the marker key of it.
		 * @property {string} autoplayKey
		 */
		this.autoplayKey = null;

		/**
		 * Is a sound set to autoplay or not?
		 * @property {boolean} autoplay
		 * @default
		 */
		this.autoplay = false;

		/**
		 * An object containing the Phaser.Sound objects for the Audio Sprite.
		 * @property {object} sounds
		 */
		this.sounds = {};
		
		// bitmap analyse texture
		this.bmpAnalyseTexture = this.game.add.bitmapDataSoundAnalyse(width, height, null, null, this.songAnalyse);

		for (var k in this.config.spritemap)
		{
			var marker = this.config.spritemap[k];
			var sound = this.game.add.audioAnalyse(this.key);
			
			sound.addBitmapSoundAnalyse(this.bmpAnalyseTexture);
			
			sound.addMarker(k, marker.start, (marker.end - marker.start), null, marker.loop);
			
			this.sounds[k] = sound;
		}

		if (this.config.autoplay)
		{
			this.autoplayKey = this.config.autoplay;
			this.play(this.autoplayKey);
			this.autoplay = this.sounds[this.autoplayKey];
		}
		
		// visual sprite holder
		this.spriteAnalyse = this.game.add.sprite(x, y, this.bmpAnalyseTexture);
	};
	// constructor setup
	Phaser.AudioAnalyseSprite.prototype = Object.create(Phaser.AudioSprite.prototype);
	Phaser.AudioAnalyseSprite.prototype.constructor = Phaser.AudioAnalyseSprite;
	
};

//	Extends the Phaser.Plugin template, setting up values we need
Phaser.Plugin.SoundAnalyse.prototype = Object.create(Phaser.Plugin.prototype);
Phaser.Plugin.SoundAnalyse.prototype.constructor = Phaser.Plugin.SoundAnalyse;


Phaser.Plugin.SoundAnalyse.prototype.add = {
	
	/**
	* Adds a new Sound Analyser into the SoundManager.
	*
	* @method Phaser.Plugin.SoundAnalyse.add#soundAnalyse
	* @param {string} key - Asset key for the sound.
	* @param {number} [volume=1] - Default value for the volume.
	* @param {boolean} [loop=false] - Whether or not the sound will loop.
	* @param {boolean} [connect=true] - Controls if the created Sound object will connect to the master gainNode of the SoundManager when running under WebAudio.
	* @param {boolean} [allowFakeData=false] - If true and sound analyse is not supported, it will allow fake data generation so you can still have some visualization
	* @return {Phaser.Sound} The new sound instance.
	*/
	soundAnalyse: function (key, volume, loop, connect, allowFakeData) {

		if (volume === undefined) { volume = 1; }
		if (loop === undefined) { loop = false; }
		if (connect === undefined) { connect = this.sounds.connectToMaster; }

		var sound = new Phaser.SoundAnalyser(this.game, key, volume, loop, connect, allowFakeData);

		this.sound._sounds.push(sound);

		return sound;

	},
	
	/**
	* Create a Sound Analyse BitmapData object.
	*
	* A BitmapData object can be manipulated and drawn to like a traditional Canvas object and used to texture Sprites.
	*
	* @method Phaser.Plugin.SoundAnalyse.add#bitmapDataSoundAnalyse
	* @param {number} [width=256] - The width of the BitmapData in pixels.
	* @param {number} [height=256] - The height of the BitmapData in pixels.
	* @param {string} [key=''] - Asset key for the BitmapData when stored in the Cache (see addToCache parameter).
	* @param {boolean} [addToCache=false] - Should this BitmapData be added to the Game.Cache? If so you can retrieve it with Cache.getBitmapData(key)
	* @param {Phaser.SoundAnalyser} [soundAnalyser=null] - The SoundAnalyser object that will provide data to this bitmap
	* @return {Phaser.BitmapData} The newly created BitmapData object.
	*/
	bitmapDataSoundAnalyse: function (width, height, key, addToCache, soundAnalyser) {

			if (addToCache === undefined) { addToCache = false; }
			if (key === undefined || key === '') { key = this.game.rnd.uuid(); }

			var texture = new Phaser.BitmapDataSoundAnalyze(this.game, key, width, height, soundAnalyser);

			if (addToCache)
			{
				this.game.cache.addBitmapData(key, texture);
			}

			return texture;

	},
	
	/**
	* This sprite will hold our visual sound analyse data object, it will represent visual texture and will
	* hold link references to some audio analyse properties
	*
	* @method Phaser.Plugin.SoundAnalyse.add#soundAnalyseSprite
	* @param {number} [x=0] - The x coordinate of the sprite. The coordinate is relative to any parent container this sprite may be in.
	* @param {number} [y=0] - The y coordinate of the sprite. The coordinate is relative to any parent container this sprite may be in.
	* @param {number} [width=game.width] - The width of the sprite
	* @param {number} [height=game.height] - The height of the sprite
	* @param {number} songKey - The key value for the song
	* @param {Boolean} autoPlay - if true song will start playing automatically
	* @param {Function} onDecodeComplete - method callback on sound decoding complete
	* @param {Object} context - context object to be provided in callback method
	* @param {Phaser.group} group - group object to add this sprite
	*/
	soundAnalyseSprite: function (x, y, width, height, songKey, autoPlay, onDecodeComplete, context, group) {
		
	   var soundAnalyseSprite = new Phaser.SoundAnalyseSprite(game, x, y, width, height, songKey, autoPlay, onDecodeComplete, context);
	   return soundAnalyseSprite;
	   
	},

	/**
	* Creates a new Audio Analyse Sprite object.
	*
	* @method Phaser.Plugin.SoundAnalyse.add#audioAnalyseSprite
	* @param {string} key - Asset key for the sound.
	* @param {number} [x=0] - The x coordinate of the sprite. The coordinate is relative to any parent container this sprite may be in.
	* @param {number} [y=0] - The y coordinate of the sprite. The coordinate is relative to any parent container this sprite may be in.
	* @param {number} [width=game.width] - The width of the sprite
	* @param {number} [height=game.height] - The height of the sprite
	* @return {Phaser.AudioAnalyseSprite} The newly created audio analyse object.
	*/
	audioAnalyseSprite: function (key, x, y, width, height) {

		return this.game.sound.addAudioAnalyseSprite(key, x, y, width, height);

	},
	

};