
/**
 * RoomZoom.js v1.2.3 Javascript Image Zoom Plugin for Prototype framework
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this package in the file LICENSE.txt.
 * It is also available through the world-wide-web at this URL:
 * http://opensource.org/licenses/osl-3.0.php
 *
 * DISCLAIMER
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 * * Neither the name of the organization nor the
 * names of its contributors may be used to endorse or promote products
 * derived from this software without specific prior written permission.
 *
 * @category   js
 * @package    RoomZoom.js
 * @copyright  Copyright (C) 2012 Oggetto Web ltd (http://oggettoweb.com/)
 * @license    http://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 * @author     Denis Obukhov <denis.obukhov@oggettoweb.com>
 */

var RoomZoom = new Class.create();
RoomZoom.prototype = {
    initialize: function (el, settings) {
        settings = Object.extend({
            //opacity of hovered area
            opacity  : 0.5,
            zoomType : 'standard',
            //innerzoom/standard/reverse/drag
            zoomWidth: 300,
            //zoomWindow default width
            zoomHeight: 300,
            //zoomWindow default height
            xOffset: 10,
            //zoomWindow x offset, can be negative(more on the left) or positive(more on the right)
            yOffset: 0,
            //zoomWindow y offset, can be negative(more on the left) or positive(more on the right)
            position: "right",
            //zoomWindow default position
            preloadImages: true,
            //image preload
            preloadText: 'Loading zoom',
            title: true,
            lens: true,
            imageOpacity: 0.4,
            alwaysOn: false,
            showEffect: 'show',
            //show/fadein
            hideEffect: 'hide',
            //hide/fadeout
            fadeinSpeed: 0.5,
            //fast/slow/number
            fadeoutSpeed: 0.5,
            //smothing speed from 1 to 99
            smoothingSpeed : 40,
            // use smoothing
            smoothing : true,
            // thumbnails switching method
            thumbnailChange: 'click',
            // enable/disable hint
            hint : true,
            hintText : 'Zoom',
            hintOpacity : 0.75,
            // hint position tl / tr / tc / bl / br / bc
            hintPosition : 'bl',
            // disable expand window
            disableExpand : false
        }, settings || {});
        var obj;
        this.obj = obj = this;
        this.settings = settings;
        this.obj.el = this.el = el;
        this.timer = null;
        this.activated = false;
        this.visible = false;
        //multitiple page galleries
        this.el.rel = ($(el).readAttribute('rel')) ? ($(el).readAttribute('rel')) : this._randomString(4);
        //ANCHOR ELEMENT
        el.zoom_active = false;
        el.zoom_disabled = false; //to disable single zoom instance
        el.largeimageloading = false; //tell us if large image is loading
        el.largeimageloaded = false; //tell us if large image is loaded
        el.scale = {};
        el.timer = null;
        el.mousepos = {};
        el.mouseDown = false;
        $(el).setStyle({
            'outline-style': 'none',
            'text-decoration': 'none'
        });
        //BASE IMAGE
        var img = this.img = $(el).select('img');
        el.title = $(el).readAttribute('title');
        el.imagetitle = img[0].readAttribute('title');
        var zoomtitle = (el.title.length > 0) ? el.title : el.imagetitle;
        var smallimage = this.smallimage = new Smallimage(img);
        var lens = this.lens = new Lens();
        var stage = this.stage = new Stage();
        var largeimage = this.largeimage = new Largeimage();
        var loader = this.loader = new Loader();
        var hint = this.hint = new Hint();
        //preventing default click,allowing the onclick event [exmple: lightbox]
        $(el).observe('click', (function (e) {
            this._expand(e);
            e.stop();
            e.preventDefault();
            return false;
        }).bindAsEventListener(this));
        //setting the default zoomType if not in settings
        var zoomtypes = ['standard', 'drag', 'innerzoom', 'reverse'];
        if(!zoomtypes.any(function(n){
            return n == obj.settings.zoomType;
        }) ) {
            obj.settings.zoomType = 'standard';
        }
        var switchTypes = ['click', 'mouseover'];
        if(!switchTypes.any(function(n){
            return n == obj.settings.thumbnailChange;
        }) ) {
            obj.settings.thumbnailChange = 'click';
        }
        /*========================================================,
| Smallimage
|---------------------------------------------------------:
| Base image into the anchor element
`========================================================*/
        function Smallimage(image) {
            var $obj = this;
            this.node = image[0];
            this.findborder = function () {
                var bordertop = 0;
                bordertop = image[0].getStyle('border-top-width');
                btop = '';
                var borderleft = 0;
                borderleft = image[0].getStyle('border-left-width');
                bleft = '';
                if (bordertop) {
                    for (i = 0; i < 3; i++) {
                        var x = [];
                        x = bordertop.substr(i, 1);
                        if (isNaN(x) == false) {
                            btop = btop + '' + bordertop.substr(i, 1);
                        } else {
                            break;
                        }
                    }
                }
                if (borderleft) {
                    for (i = 0; i < 3; i++) {
                        if (!isNaN(borderleft.substr(i, 1))) {
                            bleft = bleft + borderleft.substr(i, 1)
                        } else {
                            break;
                        }
                    }
                }
                $obj.btop = (btop.length > 0) ? eval(btop) : 0;
                $obj.bleft = (bleft.length > 0) ? eval(bleft) : 0;
            };
            this.fetchdata = function () {
                $obj.findborder();
                $obj.w = image[0].width;
                $obj.h = image[0].height;
                $obj.ow = image[0].getWidth();
                $obj.oh = image[0].getHeight();
                $obj.pos = image[0].cumulativeOffset();
                $obj.pos.l = image[0].cumulativeOffset()[0] + $obj.bleft;
                $obj.pos.t = image[0].cumulativeOffset()[1] + $obj.btop;
                $obj.pos.r = $obj.w + $obj.pos.l;
                $obj.pos.b = $obj.h + $obj.pos.t;
                $obj.rightlimit = image[0].cumulativeOffset()[0] + $obj.ow;
                $obj.bottomlimit = image[0].cumulativeOffset()[1] + $obj.oh;
            };
            this.node.onerror = function () {
                alert('Problems while loading image.');
                throw 'Problems while loading image.';
            };
            this.node.onload = function () {
                $obj.fetchdata();
                if (!$("zoomPad" + obj.el.rel)) obj.create();
            };
            return $obj;
        };
        /*========================================================,
| Loader
|---------------------------------------------------------:
| Show that the large image is loading
`========================================================*/
        function Loader() {
            var $obj = this;
            this.append = function () {
                this.node = new Element('div', ({
                    'id'        :'zoomPreload' + obj.el.rel,
                    'class'     :'zoomPreload',
                    'className' :'zoomPreload'
                }));
                this.node.setStyle({
                    'visibility': 'hidden'
                }).update(settings.preloadText);
                $('zoomPad' + obj.el.rel).appendChild(this.node);
            };
            this.show = function () {
                this.node.top = (smallimage.oh - this.node.getHeight()) / 2;
                this.node.left = (smallimage.ow - this.node.getWidth()) / 2;
                //setting position
                this.node.setStyle({
                    'top': this.node.top + 'px',
                    'left': this.node.left + 'px',
                    'position': 'absolute',
                    'visibility': 'visible'
                });
            };
            this.hide = function () {
                this.node.setStyle({
                    'visibility': 'hidden'
                });
            };
            return this;
        }
        /*========================================================,
| Lens
|---------------------------------------------------------:
| Lens over the image
`========================================================*/
        function Lens() {
            var $obj = this;
            this.node = new Element('div', ({
                'id'       : 'zoomPup'  + obj.el.rel,
                'class'    : 'zoomPup',
                'className': 'zoomPup'
            }));
            //this.nodeimgwrapper = $("<div/>").addClass('zoomPupImgWrapper');
            this.append = function () {
                $('zoomPad'  + obj.el.rel).appendChild($(this.node).hide());
                if (settings.zoomType == 'reverse') {
                    this.image = new Image();
                    this.image.src = smallimage.node.src; // fires off async
                    $(this.node).childElements().each(function(child){
                        child.remove()
                        });
                    $(this.node).appendChild(this.image);
                }
            };
            this.setdimensions = function () {
                this.node.w = (parseInt((settings.zoomWidth) / el.scale.x) > smallimage.w ) ? smallimage.w : (parseInt(settings.zoomWidth / el.scale.x));
                this.node.h = (parseInt((settings.zoomHeight) / el.scale.y) > smallimage.h ) ? smallimage.h : (parseInt(settings.zoomHeight / el.scale.y));
                this.node.top = (smallimage.oh - this.node.h - 2) / 2;
                this.node.left = (smallimage.ow - this.node.w - 2) / 2;
                //centering lens
                this.node.setStyle({
                    'top': 0,
                    'left': 0,
                    'width': this.node.w + 'px',
                    'height': this.node.h + 'px',
                    'position': 'absolute',
                    'display': 'none',
                    'borderWidth': 1 + 'px',
                    'opacity'    : settings.opacity
                });
                if (settings.zoomType == 'reverse') {
                    this.image.src = smallimage.node.src;
                    $(this.node).setOpacity(1);
                    $(this.image).setStyle({
                        'position': 'absolute',
                        'display': 'block',
                        'left': -(this.node.left + 1 - smallimage.bleft) + 'px',
                        'top': -(this.node.top + 1 - smallimage.btop) + 'px'
                    });
                }
            };
            this.setcenter = function () {
                //calculating center position
                this.node.top = (smallimage.oh - this.node.h - 2) / 2;
                this.node.left = (smallimage.ow - this.node.w - 2) / 2;
                //centering lens
                this.node.setStyle({
                    'top': this.node.top + 'px',
                    'left': this.node.left + 'px'
                });
                if (settings.zoomType == 'reverse') {
                    $(this.image).setStyle({
                        'position': 'absolute',
                        'display': 'block',
                        'left': -(this.node.left + 1 - smallimage.bleft) + 'px',
                        'top': -(this.node.top + 1 - smallimage.btop) + 'px'
                    });
                }
                //centering large image
                largeimage.setposition();
            };
            this.setposition = function (e) {
                el.mousepos.x = e.pageX;
                el.mousepos.y = e.pageY;
                var lensleft = 0;
                var lenstop = 0;
                function overleft(lens) {
                    return el.mousepos.x - (lens.w) / 2 < smallimage.pos.l;
                }
                function overright(lens) {
                    return el.mousepos.x + (lens.w) / 2 > smallimage.pos.r;
                }
                function overtop(lens) {
                    return el.mousepos.y - (lens.h) / 2 < smallimage.pos.t;
                }
                function overbottom(lens) {
                    return el.mousepos.y + (lens.h) / 2 > smallimage.pos.b;
                }
                lensleft = el.mousepos.x + smallimage.bleft - smallimage.pos.l - (this.node.w + 2) / 2;
                lenstop = el.mousepos.y + smallimage.btop - smallimage.pos.t - (this.node.h + 2) / 2;
                if (overleft(this.node)) {
                    lensleft = smallimage.bleft - 1;
                } else if (overright(this.node)) {
                    lensleft = smallimage.w + smallimage.bleft - this.node.w - 1;
                }
                if (overtop(this.node)) {
                    lenstop = smallimage.btop - 1;
                } else if (overbottom(this.node)) {
                    lenstop = smallimage.h + smallimage.btop - this.node.h - 1;
                }
                this.node.left = lensleft;
                this.node.top = lenstop;
                this.node.setStyle({
                    'left': lensleft + 'px',
                    'top': lenstop + 'px'
                });
                if (settings.zoomType == 'reverse') {
                    if (Prototype.Browser.IE && Prototype.BrowserFeatures['Version'] > 7) {
                        this.node.childElements().each(function(child){
                            child.remove()
                            });
                        this.node.appendChild(this.image);
                    }
                    this.image.setStyle({
                        'position': 'absolute',
                        'display': 'block',
                        'left': -(this.node.left + 1 - smallimage.bleft) + 'px',
                        'top': -(this.node.top + 1 - smallimage.btop) + 'px'
                    });
                }
                largeimage.setposition();
            };
            this.hide = function () {
                img[0].setOpacity(1);
                this.node.hide();
            };
            this.show = function () {
                if (settings.zoomType != 'innerzoom' && (settings.lens || settings.zoomType == 'drag')) {
                    this.node.show();
                }
                if (settings.zoomType == 'reverse') {
                    img[0].setOpacity(settings.imageOpacity);
                }
            };
            this.getoffset = function () {
                var o = {};
                o.left = $obj.node.left;
                o.top = $obj.node.top;
                return o;
            };
            return this;
        };
        /*========================================================,
| Stage
|---------------------------------------------------------:
| Window area that contains the large image
`========================================================*/
        function Stage() {
            var $obj = this;
            this.effect = null;
            this.node = new Element("div", ({
                'id'        :'zoomWindow'  + obj.el.rel,
                'class'     :'zoomWindow',
                'className' :'zoomWindow'
            }));
            this.node.update('<div id="zoomWrapper' + obj.el.rel + '" class="zoomWrapper"><div id="zoomWrapperTitle' + obj.el.rel + '" class="zoomWrapperTitle"></div><div id="zoomWrapperImage' + obj.el.rel + '" class="zoomWrapperImage"></div></div>')
            this.ieframe = new Element('iframe', ({
                'id'          :'zoomIframe' + obj.el.rel,
                'class'       :'zoomIframe',
                'className'   :'zoomIframe',
                'src'         : 'javascript:\'\';',
                'marginwidth' :0,
                'marginheight':0,
                'align'       :'bottom',
                'scrolling'   :'no',
                'frameborder' :0
            }))
            this.setposition = function () {
                this.node.leftpos = 0;
                this.node.toppos = 0;
                if (settings.zoomType != 'innerzoom') {
                    //positioning
                    switch (settings.position) {
                        case "left":
                            this.node.leftpos = (smallimage.pos.l - smallimage.bleft - Math.abs(settings.xOffset) - settings.zoomWidth > 0) ? (0 - settings.zoomWidth - Math.abs(settings.xOffset)) : (smallimage.ow + Math.abs(settings.xOffset));
                            this.node.toppos = Math.abs(settings.yOffset);
                            break;
                        case "top":
                            this.node.leftpos = Math.abs(settings.xOffset);
                            this.node.toppos = (smallimage.pos.t - smallimage.btop - Math.abs(settings.yOffset) - settings.zoomHeight > 0) ? (0 - settings.zoomHeight - Math.abs(settings.yOffset)) : (smallimage.oh + Math.abs(settings.yOffset));
                            break;
                        case "bottom":
                            this.node.leftpos = Math.abs(settings.xOffset);
                            this.node.toppos = (smallimage.pos.t - smallimage.btop + smallimage.oh + Math.abs(settings.yOffset) + settings.zoomHeight < screen.height) ? (smallimage.oh + Math.abs(settings.yOffset)) : (0 - settings.zoomHeight - Math.abs(settings.yOffset));
                            break;
                        default:
                            this.node.leftpos = (smallimage.rightlimit + Math.abs(settings.xOffset) + settings.zoomWidth < screen.width) ? (smallimage.ow + Math.abs(settings.xOffset)) : (0 - settings.zoomWidth - Math.abs(settings.xOffset));
                            this.node.toppos = Math.abs(settings.yOffset);
                            break;
                    }
                }
                this.node.setStyle({
                    'left': this.node.leftpos + 'px',
                    'top': this.node.toppos + 'px'
                });
                return this;
            };
            this.append = function () {
                $('zoomPad' + obj.el.rel).appendChild(this.node);
                this.node.setStyle({
                    'position': 'absolute',
                    'display': 'none',
                    'zIndex': 5001
                });
                if (settings.zoomType == 'innerzoom') {
                    this.node.setStyle({
                        'cursor': 'default'
                    });
                    var thickness = (smallimage.bleft == 0) ? 1 : smallimage.bleft;
                    $('zoomWrapper' + obj.el.rel).setStyle({
                        'borderWidth': thickness + 'px'
                    });
                }
                $('zoomWrapper' + obj.el.rel).setStyle({
                    'width': Math.round(settings.zoomWidth) + 'px'
                });
                $('zoomWrapperImage' + obj.el.rel).setStyle({
                    'width': '100%',
                    'height': Math.round(settings.zoomHeight) + 'px'
                });
                //zoom title
                $('zoomWrapperTitle' + obj.el.rel).setStyle({
                    'width': '100%',
                    'position': 'absolute'
                });
                $('zoomWrapperTitle' + obj.el.rel).hide();
                if (settings.title && zoomtitle.length > 0) {
                    $('zoomWrapperTitle' + obj.el.rel).update(zoomtitle).show();
                }
                $obj.setposition();
            };
            this.hide = function () {
                this.visible = false;
                switch (settings.hideEffect) {
                    case 'fadeout':
                        if (this.effect) {
                            this.effect.cancel();
                            this.effect = null;
                        }
                        this.effect = Effect.Fade(this.node, {
                            duration: settings.fadeoutSpeed,
                            to: 0,
                            afterFinish: function() {
                                $obj.effect = null;
                                $obj.node.setOpacity(1);
                            }
                        });
                        break;
                    default:
                        this.node.hide();
                        break;
                }
                this.ieframe.hide();
            };
            this.show = function () {
                if (this.visible) {
                    return;
                }
                this.activated = this.visible = true;
                switch (settings.showEffect) {
                    case 'fadein':
                        var from = 0;
                        if (this.effect) {
                            this.effect.cancel();
                            this.effect = null;
                            from = this.node.getOpacity();
                        } else {
                            this.node.setOpacity(0);
                        }
                        this.node.show();
                        this.effect = Effect.Fade(this.node, {
                            duration: settings.fadeinSpeed,
                            from: from,
                            to: 1,
                            afterFinish: function() {
                                $obj.effect = null;
                            }
                        });
                        break;
                    default:
                        this.node.show();
                        break;
                }
                if (obj.isIE6() && settings.zoomType != 'innerzoom') {
                    this.ieframe.width = this.node.width;
                    this.ieframe.height = this.node.height;
                    this.ieframe.left = this.node.leftpos;
                    this.ieframe.top = this.node.toppos;
                    this.ieframe.setStyle({
                        'display': 'block',
                        'position': "absolute",
                        'left': this.ieframe.left + 'px',
                        'top': this.ieframe.top + 'px',
                        'zIndex': 99,
                        'width': this.ieframe.width + 'px',
                        'height': this.ieframe.height + 'px'
                    });
                    $('zoomPad' + obj.el.rel).appendChild(this.ieframe);
                    this.ieframe.show();
                };
            };
        };
        /*========================================================,
| LargeImage
|---------------------------------------------------------:
| The large detailed image
`========================================================*/
        function Largeimage() {
            var $obj = this;
            this.node = new Image();
            this.loadimage = function (url) {
                //showing preload
                loader.show();
                this.url = url;
                this.node.style.position = 'absolute';
                this.node.style.border = '0px';
                this.node.style.display = 'none';
                this.node.style.left = '-5000px';
                this.node.style.top = '0px';
                document.body.appendChild(this.node);
                this.node.src = url; // fires off async
            };
            this.fetchdata = function () {
                var image = $(this.node);
                var scale = {};
                this.node.style.display = 'block';
                $obj.w = image.width;
                $obj.h = image.height;
                $obj.pos = image.cumulativeOffset();
                $obj.pos.l = image.cumulativeOffset()[0];
                $obj.pos.t = image.cumulativeOffset()[1];
                $obj.pos.r = $obj.w + $obj.pos.l;
                $obj.pos.b = $obj.h + $obj.pos.t;
                scale.x = ($obj.w / smallimage.w);
                scale.y = ($obj.h / smallimage.h);
                el.scale = scale;
                document.body.removeChild(this.node);
                $('zoomWrapperImage' + obj.el.rel).childElements().each(function(child){
                    child.remove()
                    });
                $('zoomWrapperImage' + obj.el.rel).appendChild(this.node);
                //setting lens dimensions;
                lens.setdimensions();
            };
            this.node.onerror = function () {
                alert('Problems while loading the big image.');
                throw 'Problems while loading the big image.';
            };
            this.node.onload = function () {
                //fetching data
                $obj.fetchdata();
                loader.hide();
                el.largeimageloading = false;
                el.largeimageloaded = true;
                if (settings.zoomType == 'drag' || settings.alwaysOn || el.zoom_active) {
                    lens.show();
                    stage.show();
                    lens.setcenter();
                }
            };
            this.setposition = function () {
                var left = -el.scale.x * (lens.getoffset().left - smallimage.bleft + 1);
                var top = -el.scale.y * (lens.getoffset().top - smallimage.btop + 1);
                left = Math.round(left);
                top = Math.round(top);
                if(settings.smoothing == false) {
                    $($obj.node).setStyle({
                        'left': left + 'px',
                        'top': top + 'px'
                    });
                } else {
                    var leftLarge, topLarge, widthDiff, heightDiff;
                    leftLarge = parseInt($($obj.node).getStyle('left'));
                    topLarge = parseInt($($obj.node).getStyle('top'));
                    widthDiff = (left - leftLarge);
                    heightDiff = (top - topLarge);
                    if (!heightDiff && !widthDiff) {
                        $obj.continueMoves = null;
                        return
                    }
                    $obj.continueMoves = true;
                    widthDiff *= settings.smoothingSpeed / 100;
                    if (widthDiff < 1 && widthDiff > 0) {
                        widthDiff = 1;
                    } else {
                        if (widthDiff > -1 && widthDiff < 0) {
                            widthDiff = -1;
                        }
                    }
                    leftLarge += widthDiff;
                    heightDiff *= settings.smoothingSpeed / 100;
                    if (heightDiff < 1 && heightDiff > 0) {
                        heightDiff = 1;
                    } else {
                        if (heightDiff > -1 && heightDiff < 0) {
                            heightDiff = -1;
                        }
                    }
                    topLarge += heightDiff;

                    $($obj.node).setStyle({
                            'left': leftLarge + 'px',
                            'top': topLarge + 'px'
                    });
                }
                if($obj.continueMoves) {
                    $obj.continueMoves = setTimeout(obj._continueMove.bind(obj), 100);
                }
            };
            return this;
        };

        function Hint() {
            var $obj = this;
            this.node = new Element('div', ({
                'class'     : 'zoomHint'
                'className' : 'zoomHint',
            }));
            this.node.setStyle({
                'overflow' : 'hidden',
                'position' : 'absolute',
                'zIndex'   : 1,
                'right'    : 'auto',
                'top'      : 'auto',
                'left'     : 'auto',
                'bottom'   : 'auto'
//                'max-width': obj.largeimage.node.getWidth() - 5 + 'px'
            });
            this.appended = false;

            this.append = function() {
                if (settings.hintText) {
                    this.node.update(settings.hintText);
                }
                this.node.setOpacity(settings.hintOpacity);
                el.zoomPad.appendChild(this.node);
                var position = new String(settings.hintPosition).toArray()
                switch (position[0]) {
                    case 't' :
                        this.node.setStyle({'top' : '2px'});
                        break;
                    default :
                        this.node.setStyle({'bottom' : '2px'});

                }
                switch (position[1]) {
                    case 'c' :
                        this.node.setStyle({'left' : Math.round((el.zoomPad.getWidth() - this.node.getWidth()) / 2) + 'px'});
                        break;
                    case 'r' :
                        this.node.setStyle({'right' : '4px'});
                        break;
                    default :
                        this.node.setStyle({'left' : '4px'});

                }
                this.appended = true;
            }

            this.hide = function(){
                if (this.appended) {
                    this.node.hide();
                }
            }
            this.show = function() {
                if (this.appended) {
                    this.node.show();
                }
            }
        }
        if (img[0].complete) {
            //fetching data from sallimage if was previously loaded
            smallimage.fetchdata();
            if (!$("zoomPad" + obj.el.rel)) obj.create();
        }
    },
    create: function () { //create the main objects
        //create ZoomPad
        if (!$("zoomPad" + this.el.rel)) {
            this.el.zoomPad = new Element('div', ({
                'id':'zoomPad' + this.el.rel,
                'class'     : 'zoomPad',
                'className' : 'zoomPad'
            }));
            this.img[0].wrap(this.el.zoomPad);
        }
        if(this.settings.zoomType == 'innerzoom'){
            this.settings.zoomWidth = this.smallimage.w;
            this.settings.zoomHeight = this.smallimage.h;
        }
        //creating ZoomPup
        if (!$("zoomPup" + this.el.rel)) {
            this.lens.append();
        }
        //creating zoomWindow
        if (!$("zoomWindow" + this.el.rel)) {
            this.stage.append();
        }
        //creating Preload
        if (!$("zoomPreload" + this.el.rel)) {
            this.loader.append();
        }
        //preloading images
        if (this.settings.preloadImages || this.settings.zoomType == 'drag' || this.settings.alwaysOn) {
            this.load();
        }
        if (this.settings.hint) {
            this.hint.append();
        }
        this.init();
    },
    init: function () {
        var smallimage = this.smallimage;
        var el = this.el;
        var settings = this.settings;
        //drag option
        if (this.settings.zoomType == 'drag') {
            $("zoomPad" + this.el.rel).observe('mousedown', function () {
                this.el.mouseDown = true;
            }.bind(this));
            $("zoomPad" + this.el.rel).observe('mouseup', function () {
                this.el.mouseDown = false;
            }.bind(this));
            document.body.ondragstart = function () {
                return false;
            };
            $("zoomPad" + this.el.rel).setStyle({
                'cursor': 'default'
            });
            $("zoomPup" + this.el.rel).setStyle({
                'cursor': 'move'
            });
        }
        if (this.settings.zoomType == 'innerzoom') {
            $("zoomWrapper"  + this.el.rel).setStyle({
                'cursor': 'crosshair'
            });
        }
        $("zoomPad" + this.el.rel).observe('mouseover', function (event) {
            clearTimeout(this.timer);
            this._drag(event);
        }.bind(this));
        $("zoomPad" + this.el.rel).observe('mouseout', function (event) {
            //mouseleave simulation
                this.timer = setTimeout(function(){this.deactivate()}.bind(this),20)
        }.bind(this));
        $("zoomPad" + this.el.rel).observe('mousemove', function (e) {
            //prevent fast mouse mevements not to fire the mouseout event
            if (e.pageX > smallimage.pos.r || e.pageX < smallimage.pos.l || e.pageY < smallimage.pos.t || e.pageY > smallimage.pos.b) {
                this.lens.setcenter();
                return false;
            }
            el.zoom_active = true;
            if (el.largeimageloaded && this.activated) {
                this.activate(e);
            }
            if (el.largeimageloaded && (settings.zoomType != 'drag' || (settings.zoomType == 'drag' && el.mouseDown))) {
                this.lens.setposition(e);
            }
        }.bind(this));
        var thumb_preload = new Array();
        var i = 0;
        //binding click event on thumbnails
        var thumblist = new Array();
        thumblist = $$('a').findAll(function (link) {
            var regex = new RegExp("^gallery[\\s]*:[\\s]*" + this.trim(el.rel), "i");
            var rel = link.readAttribute('rel');
            if (regex.test(rel)) {
                return link;
            }
        }.bind(this));
        // @todo: fix this shit
        // if (thumblist.length > 0) {
        // //getting the first to the last
        // var first = thumblist.splice(0, 1);
        // thumblist.push(first);
        // }
        thumblist.each(function (thumbnail) {
            //preloading thumbs
            if (settings.preloadImages) {
                thumb_preload[i] = new Image();
                thumb_preload[i].src = thumbnail.readAttribute('href');
                i++;
            }
            thumbnail.observe(this.settings.thumbnailChange, function (e) {
                if($(thumbnail).hasClassName('zoomThumbActive')){
                    e.stop();
                    return false;
                }
                thumblist.each(function (thumb) {
                    $(thumb).removeClassName('zoomThumbActive');
                });
                e.stop();
                this.swapimage(thumbnail);
                return false;
            }.bind(this));

            if (this.settings.thumbnailChange != 'click') {
                thumbnail.observe('click', function (e) {
                    e.stop();
                    return false;
                });
            }
        }.bind(this)
            )
    },
    load: function () {
        if (this.el.largeimageloaded == false && this.el.largeimageloading == false) {
            var url = $(this.el).readAttribute('href');
            this.el.largeimageloading = true;
            this.largeimage.loadimage(url);
        }
    },
    activate: function (e) {
        clearTimeout(this.el.timer);
        //show lens and zoomWindow
        this.lens.show();
        this.stage.show();
        this.hint.hide();
    },
    deactivate: function (e) {
        switch (this.settings.zoomType) {
            case 'drag':
                //nothing or lens.setcenter();
                break;
            default:
                this.img[0].writeAttribute('title', this.el.imagetitle);
                $(this.el).writeAttribute('title', this.el.title);
                if (this.settings.alwaysOn) {
                    this.lens.setcenter();
                } else {
                    this.stage.hide();
                    this.lens.hide();
                }
                break;
        }
        this.hint.show();
        this.el.zoom_active = false;
    },
    swapimage: function (link) {
        this.el.largeimageloading = false;
        this.el.largeimageloaded = false;
        var smallimage = link.readAttribute('rev');
        var largeimage = link.readAttribute('href');
        if (smallimage && largeimage) {
            $(link).addClassName('zoomThumbActive');
            $(this.el).writeAttribute('href', largeimage);
            this.img[0].writeAttribute('src', smallimage);
            this.lens.hide();
            this.stage.hide();
            this.load();
        } else {
            alert('ERROR :: Missing parameter for largeimage or smallimage.');
            throw 'ERROR :: Missing parameter for largeimage or smallimage.';
        }
        return false;
    },
    isIE6 : function() {
        return (Prototype.Browser.IE && Prototype.BrowserFeatures['Version'] < 7);
    },
    trim : function (str) {
        var string = new String(str);
        return string.strip();
    },

    _continueMove : function() {
        this.largeimage.setposition()
    },
    _drag : function (event) {
//        var relatedTarget = $(event.relatedTarget || event.toElement);
//        if (relatedTarget != event.currentTarget && (relatedTarget.childOf(event.currentTarget) == false)) {
            this.img[0].writeAttribute('title','');
            this.el.writeAttribute('title','');
            this.el.zoom_active = true;
            //if loaded then activate else load large image
            this.smallimage.fetchdata();
            if (this.el.largeimageloaded) {
                this.activate(event);
            } else {
                this.load();
            }
//        }
    },

    changeZoomType : function(type) {
        var zoomtypes = ['standard', 'drag', 'innerzoom'];
        if(!zoomtypes.any(function(n){
            return n == type;
        }) ) {
            type = 'standard';
        }
        this.settings.zoomType = type;
        $('zoomWindow'  + this.el.rel).remove()
        this.stage.append()
        this.init()
    },

    _randomString : function (length) {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');

        if (! length) {
            length = Math.floor(Math.random() * chars.length);
        }

        var str = '';
        for (var i = 0; i < length; i++) {
            str += chars[Math.floor(Math.random() * chars.length)];
        }
        return str;
    },

    _expand: function(e) {
        e.preventDefault();
        e.stop();

        if(!this.settings.disableExpand) {
            this.expand();
        }

        return false;
    },

    expand : function() {
        window.lightbox.start(this.el);
    }
};


// -----------------------------------------------------------------------------------
//
//	Lightbox v2.05
//	by Lokesh Dhakar - http://www.lokeshdhakar.com
//	Last Modification: 3/18/11
//
//	For more information, visit:
//	http://lokeshdhakar.com/projects/lightbox2/
//
//	Licensed under the Creative Commons Attribution 2.5 License - http://creativecommons.org/licenses/by/2.5/
//  	- Free for use in both personal and commercial projects
//		- Attribution requires leaving author name, author link, and the license info intact.
//
//  Thanks: Scott Upton(uptonic.com), Peter-Paul Koch(quirksmode.com), and Thomas Fuchs(mir.aculo.us) for ideas, libs, and snippets.
//  		Artemy Tregubenko (arty.name) for cleanup and help in updating to latest ver of proto-aculous.
//
// -----------------------------------------------------------------------------------
/*

    Table of Contents
    -----------------
    Configuration

    Lightbox Class Declaration
    - initialize()
    - updateImageList()
    - start()
    - changeImage()
    - resizeImageContainer()
    - showImage()
    - updateDetails()
    - updateNav()
    - enableKeyboardNav()
    - disableKeyboardNav()
    - keyboardAction()
    - preloadNeighborImages()
    - end()

    Function Calls
    - document.observe()

*/
// -----------------------------------------------------------------------------------

//
//  Configurationl
//
LightboxOptions = Object.extend({
    fileLoadingImage:        'images/zoomloader.gif',
    overlayOpacity: 0.8,   // controls transparency of shadow overlay

    animate: true,         // toggles resizing animations
    resizeSpeed: 7,        // controls the speed of the image resizing animations (1=slowest and 10=fastest)

    borderSize: 0,         //if you adjust the padding in the CSS, you will need to update this variable

	// When grouping images this is used to write: Image # of #.
	// Change it for non-english localization
	labelImage: "Image",
	labelOf: "of"
}, window.LightboxOptions || {});

// -----------------------------------------------------------------------------------

var Lightbox = Class.create();

Lightbox.prototype = {
    imageArray: [],
    activeImage: undefined,

    // initialize()
    // Constructor runs on completion of the DOM loading. Calls updateImageList and then
    // the function inserts html at the bottom of the page which is used to display the shadow
    // overlay and the image container.
    //
    initialize: function() {

        this.keyboardAction = this.keyboardAction.bindAsEventListener(this);

        if (LightboxOptions.resizeSpeed > 10) LightboxOptions.resizeSpeed = 10;
        if (LightboxOptions.resizeSpeed < 1)  LightboxOptions.resizeSpeed = 1;

	    this.resizeDuration = LightboxOptions.animate ? ((11 - LightboxOptions.resizeSpeed) * 0.15) : 0;
	    this.overlayDuration = LightboxOptions.animate ? 0.2 : 0;  // shadow fade in/out duration

        // When Lightbox starts it will resize itself from 250 by 250 to the current image dimension.
        // If animations are turned off, it will be hidden as to prevent a flicker of a
        // white 250 by 250 box.
        var size = (LightboxOptions.animate ? 250 : 1) + 'px';


        // Code inserts html at the bottom of the page that looks similar to this:
        //
        //  <div id="overlay"></div>
        //  <div id="lightbox">
        //      <div id="outerImageContainer">
        //          <div id="imageContainer">
        //              <img id="lightboxImage">
        //              <div style="" id="hoverNav">
        //                  <a href="#" id="closeLink"></a>
        //                  <a href="#" id="prevLink"></a>
        //                  <a href="#" id="nextLink"></a>
        //              </div>
        //              <div id="loading">
        //                  <a href="#" id="loadingLink">
        //                      <img src="images/loading.gif">
        //                  </a>
        //              </div>
        //          </div>
        //      </div>
        //      <div id="imageDataContainer">
        //          <div id="imageData">
        //              <div id="imageDetails">
        //                  <span id="caption"></span>
        //                  <span id="numberDisplay"></span>
        //              </div>
        //              <div id="bottomNav">
        //              </div>
        //          </div>
        //      </div>
        //  </div>


        var objBody = $$('body')[0];

		objBody.appendChild(Builder.node('div',{id:'overlay'}));

        objBody.appendChild(Builder.node('div',{id:'lightbox'}, [
            Builder.node('div',{id:'outerImageContainer'},
                Builder.node('div',{id:'imageContainer'}, [
                    Builder.node('img',{id:'lightboxImage'}),
                    Builder.node('div',{id:'hoverNav'}, [
                        Builder.node('a',{id:'closeLink', href: '#'}),
                        Builder.node('a',{id:'prevLink', href: '#'}),
                        Builder.node('a',{id:'nextLink', href: '#'})
                    ]),
                    Builder.node('div',{id:'loading'},
                        Builder.node('a',{id:'loadingLink', href: '#'},
                            Builder.node('img', {src: LightboxOptions.fileLoadingImage})
                        )
                    )
                ])
            ),
            Builder.node('div', {id:'imageDataContainer'},
                Builder.node('div',{id:'imageData'}, [
                    Builder.node('div',{id:'imageDetails'}, [
                        Builder.node('span',{id:'caption'}),
                        Builder.node('span',{id:'numberDisplay'})
                    ]),
                    Builder.node('div',{id:'bottomNav'})
                ])
            )
        ]));


		$('overlay').hide().observe('click', (function() {this.end();}).bind(this));
		$('lightbox').hide().observe('click', (function(event) {if (event.element().id == 'lightbox') this.end();}).bind(this));
		$('outerImageContainer').setStyle({'width': size, 'height': size});
		$('prevLink').observe('click', (function(event) {event.stop();this.changeImage(this.activeImage - 1);}).bindAsEventListener(this));
		$('nextLink').observe('click', (function(event) {event.stop();this.changeImage(this.activeImage + 1);}).bindAsEventListener(this));
		$('closeLink').observe('click', (function(event) {event.stop();this.end();}).bind(this));
		$('loadingLink').observe('click', (function(event) {event.stop();this.end();}).bind(this));

        var th = this;
        (function(){
            var ids =
                'overlay lightbox outerImageContainer imageContainer lightboxImage hoverNav prevLink nextLink loading loadingLink ' +
                'imageDataContainer imageData imageDetails caption numberDisplay bottomNav closeLink';
            $w(ids).each(function(id){th[id] = $(id);});
        }).defer();
    },

    //
    //  start()
    //  Display overlay and lightbox. If image is part of a set, add siblings to imageArray.
    //
    start: function(imageLink) {

        $$('select', 'object', 'embed').each(function(node){node.style.visibility = 'hidden'});

        // stretch overlay to fill page and fade in
        var arrayPageSize = this.getPageSize();
        $('overlay').setStyle({'width': arrayPageSize[0] + 'px', 'height': arrayPageSize[1] + 'px'});

        new Effect.Appear(this.overlay, {duration: this.overlayDuration, from: 0.0, to: LightboxOptions.overlayOpacity});

        this.imageArray = [];
        var imageNum = 0;

        if ((imageLink.getAttribute("rel") == 'lightbox')){
            // if image is NOT part of a set, add single image to imageArray
            this.imageArray.push([imageLink.href, imageLink.title]);
        } else {
            // if image is part of a set..
            this.imageArray =
                $$(imageLink.tagName + '[href][rel="gallery:' + imageLink.rel + '"]').
                collect(function(anchor){return [anchor.href, anchor.title];}).
                uniq();
            if(this.imageArray.length >= 1) {
                while (this.imageArray[imageNum][0] != imageLink.href) {imageNum++;}
            } else {
                this.imageArray.push([imageLink.href, imageLink.title]);
            }
        }

        // calculate top and left offset for the lightbox
        var arrayPageScroll = document.viewport.getScrollOffsets();
        var lightboxTop = arrayPageScroll[1] + (document.viewport.getHeight() / 20);
        var lightboxLeft = arrayPageScroll[0];
        this.lightbox.setStyle({'top': lightboxTop + 'px', 'left': lightboxLeft + 'px'}).show();

        this.changeImage(imageNum);
    },

    //
    //  changeImage()
    //  Hide most elements and preload image in preparation for resizing image container.
    //
    changeImage: function(imageNum) {
        if (imageNum > (this.imageArray.length - 1)) {
            imageNum = 0;
        } else if (imageNum < 0) {
            imageNum = this.imageArray.length - 1;
        }

        this.activeImage = imageNum; // update global var

        // hide elements during transition
        if (LightboxOptions.animate) this.loading.show();
        this.lightboxImage.hide();
        this.hoverNav.hide();
        this.prevLink.hide();
        this.nextLink.hide();
		// HACK: Opera9 does not currently support scriptaculous opacity and appear fx
        this.imageDataContainer.setStyle({'opacity': .0001});
        this.numberDisplay.hide();

        var imgPreloader = new Image();

        // once image is preloaded, resize image container
        imgPreloader.onload = (function(){
            this.lightboxImage.src = this.imageArray[this.activeImage][0];

            var pageSize = this.getWindowSize();

            if (imgPreloader.width > pageSize[0]) {
                var newWidth = pageSize[0] * 0.9;
                var k = newWidth / imgPreloader.width;
                imgPreloader.width = newWidth;
                imgPreloader.height *= k;
            }

            if (imgPreloader.height > pageSize[1]) {
                var newHeight = pageSize[1] * 0.9;
                var k = newHeight / imgPreloader.height;
                imgPreloader.height = newHeight;
                imgPreloader.width *= k;
            }
            /*Bug Fixed by Andy Scott*/
            this.lightboxImage.width = imgPreloader.width;
            this.lightboxImage.height = imgPreloader.height;

            /*End of Bug Fix*/

            this.lightboxImage.setStyle({
                'width' : "100%",
                'height': "auto"
            })
            this.resizeImageContainer(imgPreloader.width, imgPreloader.height);
        }).bind(this);
        imgPreloader.src = this.imageArray[this.activeImage][0];
    },

    //
    //  resizeImageContainer()
    //
    resizeImageContainer: function(imgWidth, imgHeight) {

        // get current width and height
        var widthCurrent  = this.outerImageContainer.getWidth();
        var heightCurrent = this.outerImageContainer.getHeight();

        // get new width and height
        var widthNew  = (imgWidth  + LightboxOptions.borderSize * 2);
        var heightNew = (imgHeight + LightboxOptions.borderSize * 2);



        // scalars based on change from old to new
        var xScale = (widthNew  / widthCurrent)  * 100;
        var yScale = (heightNew / heightCurrent) * 100;

        // calculate size difference between new and old image, and resize if necessary
        var wDiff = widthCurrent - widthNew;
        var hDiff = heightCurrent - heightNew;

        if (hDiff != 0) new Effect.Scale(this.outerImageContainer, yScale, {scaleX: false, duration: this.resizeDuration, queue: 'front'});
        if (wDiff != 0) new Effect.Scale(this.outerImageContainer, xScale, {scaleY: false, duration: this.resizeDuration});

        // if new and old image are same size and no scaling transition is necessary,
        // do a quick pause to prevent image flicker.
        var timeout = 0;
        if ((hDiff == 0) && (wDiff == 0)){
            timeout = 100;
            if (Prototype.Browser.IE) timeout = 250;
        }

        (function(){
            this.imageDataContainer.setStyle({'width': widthNew + 'px'});

            this.showImage();
        }).bind(this).delay(timeout / 1000);
    },

    //
    //  showImage()
    //  Display image and begin preloading neighbors.
    //
    showImage: function(){
        this.loading.hide();
        new Effect.Appear(this.lightboxImage, {
            duration: this.resizeDuration,
            queue: 'end',
            afterFinish: (function(){this.updateDetails();}).bind(this)
        });
        this.preloadNeighborImages();
    },

    //
    //  updateDetails()
    //  Display caption, image number, and bottom nav.
    //
    updateDetails: function() {

        this.caption.update(this.imageArray[this.activeImage][1]).show();

        // if image is part of set display 'Image x of x'
        if (this.imageArray.length > 1){
            this.numberDisplay.update( LightboxOptions.labelImage + ' ' + (this.activeImage + 1) + ' ' + LightboxOptions.labelOf + '  ' + this.imageArray.length).show();
        }

        new Effect.Parallel(
            [
                new Effect.SlideDown(this.imageDataContainer, {sync: true, duration: this.resizeDuration, from: 0.0, to: 1.0}),
                //new Effect.Appear(this.imageDataContainer, {sync: true, duration: this.resizeDuration})
            ],
            {
                duration: this.resizeDuration,
                afterFinish: (function() {
	                // update overlay size and update nav
	                var arrayPageSize = this.getPageSize();
	                this.overlay.setStyle({'width': arrayPageSize[0] + 'px', 'height': arrayPageSize[1] + 'px'});
	                this.updateNav();
                }).bind(this)
            }
        );
    },

    //
    //  updateNav()
    //  Display appropriate previous and next hover navigation.
    //
    updateNav: function() {

        this.hoverNav.show();
        if (this.imageArray.length > 1) {
            this.prevLink.show();
            this.nextLink.show();
        }

        this.enableKeyboardNav();
    },

    //
    //  enableKeyboardNav()
    //
    enableKeyboardNav: function() {
        document.observe('keydown', this.keyboardAction);
    },

    //
    //  disableKeyboardNav()
    //
    disableKeyboardNav: function() {
        document.stopObserving('keydown', this.keyboardAction);
    },

    //
    //  keyboardAction()
    //
    keyboardAction: function(event) {
        var keycode = event.keyCode;

        var escapeKey;
        if (event.DOM_VK_ESCAPE) {  // mozilla
            escapeKey = event.DOM_VK_ESCAPE;
        } else { // ie
            escapeKey = 27;
        }

        var key = String.fromCharCode(keycode).toLowerCase();

        if (key.match(/x|o|c/) || (keycode == escapeKey)){ // close lightbox
            this.end();
        } else if ((key == 'p') || (keycode == 37)){ // display previous image
            if (this.activeImage != 0){
                this.disableKeyboardNav();
                this.changeImage(this.activeImage - 1);
            }
        } else if ((key == 'n') || (keycode == 39)){ // display next image
            if (this.activeImage != (this.imageArray.length - 1)){
                this.disableKeyboardNav();
                this.changeImage(this.activeImage + 1);
            }
        }
    },

    //
    //  preloadNeighborImages()
    //  Preload previous and next images.
    //
    preloadNeighborImages: function(){
        var preloadNextImage, preloadPrevImage;
        if (this.imageArray.length > this.activeImage + 1){
            preloadNextImage = new Image();
            preloadNextImage.src = this.imageArray[this.activeImage + 1][0];
        }
        if (this.activeImage > 0){
            preloadPrevImage = new Image();
            preloadPrevImage.src = this.imageArray[this.activeImage - 1][0];
        }

    },

    //
    //  end()
    //
    end: function() {
        this.disableKeyboardNav();
        this.lightbox.hide();
        new Effect.Fade(this.overlay, {duration: this.overlayDuration});
        $$('select', 'object', 'embed').each(function(node){node.style.visibility = 'visible'});
    },

    //
    //  getPageSize()
    //
    getPageSize: function() {

	     var xScroll, yScroll;

		if (window.innerHeight && window.scrollMaxY) {
			xScroll = window.innerWidth + window.scrollMaxX;
			yScroll = window.innerHeight + window.scrollMaxY;
		} else if (document.body.scrollHeight > document.body.offsetHeight){ // all but Explorer Mac
			xScroll = document.body.scrollWidth;
			yScroll = document.body.scrollHeight;
		} else { // Explorer Mac...would also work in Explorer 6 Strict, Mozilla and Safari
			xScroll = document.body.offsetWidth;
			yScroll = document.body.offsetHeight;
		}

		var windowWidth, windowHeight;

		if (self.innerHeight) {	// all except Explorer
			if(document.documentElement.clientWidth){
				windowWidth = document.documentElement.clientWidth;
			} else {
				windowWidth = self.innerWidth;
			}
			windowHeight = self.innerHeight;
		} else if (document.documentElement && document.documentElement.clientHeight) { // Explorer 6 Strict Mode
			windowWidth = document.documentElement.clientWidth;
			windowHeight = document.documentElement.clientHeight;
		} else if (document.body) { // other Explorers
			windowWidth = document.body.clientWidth;
			windowHeight = document.body.clientHeight;
		}

		// for small pages with total height less then height of the viewport
		if(yScroll < windowHeight){
			pageHeight = windowHeight;
		} else {
			pageHeight = yScroll;
		}

		// for small pages with total width less then width of the viewport
		if(xScroll < windowWidth){
			pageWidth = xScroll;
		} else {
			pageWidth = windowWidth;
		}

		return [pageWidth,pageHeight];
	},
    /**
     * Get visible window size
     * 
     * @return array
     */
    getWindowSize: function() {
        var windowWidth, windowHeight;
        
        if (self.innerHeight) { // all except Explorer
            if(document.documentElement.clientWidth){
                windowWidth = document.documentElement.clientWidth;
            } else {
                windowWidth = self.innerWidth;
            }
            windowHeight = self.innerHeight;
        } else if (document.documentElement && document.documentElement.clientHeight) { // Explorer 6 Strict Mode
            windowWidth = document.documentElement.clientWidth;
            windowHeight = document.documentElement.clientHeight;
        } else if (document.body) { // other Explorers
            windowWidth = document.body.clientWidth;
            windowHeight = document.body.clientHeight;
        }

        return [windowWidth, windowHeight];
    }
}

document.observe('dom:loaded', function () {window.lightbox = new Lightbox();});