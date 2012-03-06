
/**
 * RoomZoom.js Javascript Image Zoom Plugin for Prototype framework
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
            fadeinSpeed: '0.5',
            //fast/slow/number
            fadeoutSpeed: '0.5',
            //smothing speed from 1 to 99
            smoothingSpeed : 40,
            // use smoothing
            smoothing : true,
            // thumbnails switching method
            thumbnailChange: 'click'
        }, settings || {});
        var obj;
        this.obj = obj = this;
        this.settings = settings;
        this.obj.el = this.el = el;
        this.el.rel = $(el).readAttribute('rel');
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
        //preventing default click,allowing the onclick event [exmple: lightbox]
        $(el).observe('click', function (e) {
            e.preventDefault();
            return false;
        });
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
                $obj.bottomlimit = image[0].cumulativeOffset()[1].top + $obj.oh;
            };
            this.node.onerror = function () {
                alert('Problems while loading image.');
                throw 'Problems while loading image.';
            };
            this.node.onload = function () {
                $obj.fetchdata();
                if (!$("zoomPad")) obj.create();
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
                    'id':'zoomPreload'
                }));
                this.node.setStyle({
                    'visibility': 'hidden'
                }).update(settings.preloadText);
                $('zoomPad').appendChild(this.node);
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
                'id':'zoomPup'
            }));
            //this.nodeimgwrapper = $("<div/>").addClass('zoomPupImgWrapper');
            this.append = function () {
                $('zoomPad').appendChild($(this.node).hide());
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
                    'borderWidth': 1 + 'px'
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
                'id':'zoomWindow'
            }));
            this.node.update('<div id="zoomWrapper"><div id="zoomWrapperTitle"></div><div id="zoomWrapperImage"></div></div>')
            this.ieframe = new Element('iframe', ({
                'id':'zoomIframe',
                'src': 'javascript:\'\';',
                'marginwidth':0,
                'marginheight':0,
                'align':'bottom',
                'scrolling':'no',
                'frameborder':0
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
                $('zoomPad').appendChild(this.node);
                this.node.setStyle({
                    position: 'absolute',
                    display: 'none',
                    zIndex: 5001
                });
                if (settings.zoomType == 'innerzoom') {
                    this.node.setStyle({
                        cursor: 'default'
                    });
                    var thickness = (smallimage.bleft == 0) ? 1 : smallimage.bleft;
                    $('zoomWrapper').setStyle({
                        borderWidth: thickness + 'px'
                    });
                }
                $('zoomWrapper').setStyle({
                    width: Math.round(settings.zoomWidth) + 'px' ,
                    borderWidth: thickness + 'px'
                });
                $('zoomWrapperImage').setStyle({
                    width: '100%',
                    height: Math.round(settings.zoomHeight) + 'px'
                });
                //zoom title
                $('zoomWrapperTitle').setStyle({
                    width: '100%',
                    position: 'absolute'
                });
                $('zoomWrapperTitle').hide();
                if (settings.title && zoomtitle.length > 0) {
                    $('zoomWrapperTitle').update(zoomtitle).show();
                }
                $obj.setposition();
            };
            this.hide = function () {
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
                        display: 'block',
                        position: "absolute",
                        left: this.ieframe.left + 'px',
                        top: this.ieframe.top + 'px',
                        zIndex: 99,
                        width: this.ieframe.width + 'px',
                        height: this.ieframe.height + 'px'
                    });
                    $('zoomPad').appendChild(this.ieframe);
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
                $('zoomWrapperImage').childElements().each(function(child){
                    child.remove()
                    });
                $('zoomWrapperImage').appendChild(this.node);
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
                var top = -el.scale.y * (lens.getoffset().top - smallimage.btop + 10);
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
        if (img[0].complete) {
            //fetching data from sallimage if was previously loaded
            smallimage.fetchdata();
            if (!$("zoomPad")) obj.create();
        }
    },
    create: function () { //create the main objects
        //create ZoomPad
        if (!$("zoomPad")) {
            this.el.zoomPad = new Element('div', ({
                'id':'zoomPad'
            }));
            this.img[0].wrap(this.el.zoomPad);
        }
        if(this.settings.zoomType == 'innerzoom'){
            this.settings.zoomWidth = this.smallimage.w;
            this.settings.zoomHeight = this.smallimage.h;
        }
        //creating ZoomPup
        if (!$("zoomPup")) {
            this.lens.append();
        }
        //creating zoomWindow
        if (!$("zoomWindow")) {
            this.stage.append();
        }
        //creating Preload
        if (!$("zoomPreload")) {
            this.loader.append();
        }
        //preloading images
        if (this.settings.preloadImages || this.settings.zoomType == 'drag' || this.settings.alwaysOn) {
            this.load();
        }
        this.init();
    },
    init: function () {
        var smallimage = this.smallimage;
        var el = this.el;
        var settings = this.settings;
        //drag option
        if (this.settings.zoomType == 'drag') {
            $("zoomPad").observe('mousedown', function () {
                this.el.mouseDown = true;
            }.bind(this));
            $("zoomPad").observe('mouseup', function () {
                this.el.mouseDown = false;
            }.bind(this));
            document.body.ondragstart = function () {
                return false;
            };
            $("zoomPad").setStyle({
                cursor: 'default'
            });
            $("zoomPup").setStyle({
                cursor: 'move'
            });
        }
        if (this.settings.zoomType == 'innerzoom') {
            $("zoomWrapper").setStyle({
                cursor: 'crosshair'
            });
        }
        $("zoomPad").observe('mouseenter', function (event) {
            this._drag(event);
        }.bind(this));
        $("zoomPad").observe('mouseover', function (event) {
            this._drag(event);
        }.bind(this));
        $("zoomPad").observe('mouseout', function (event) {
            //mouseleave simulation
            var relatedTarget = $(event.relatedTarget || event.toElement);
            if (relatedTarget != event.currentTarget && relatedTarget.childOf(event.currentTarget) == false ) {

this.deactivate();
            }
        }.bind(this));
        $("zoomPad").observe('mousemove', function (e) {
            //prevent fast mouse mevements not to fire the mouseout event
            if (e.pageX > smallimage.pos.r || e.pageX < smallimage.pos.l || e.pageY < smallimage.pos.t || e.pageY > smallimage.pos.b) {
                this.lens.setcenter();
                return false;
            }
            el.zoom_active = true;
            if (el.largeimageloaded && $('zoomWindow').getStyle('visibility') != 'visible') {
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
            var regex = new RegExp("gallery[\\s]*:[\\s]*'" + el.rel.trim() + "'", "i");
            var rel = link.readAttribute('rel');
            if (regex.test(rel)) {
                return link;
            }
        });
        // @todo: fix this shit
        // if (thumblist.length > 0) {
        // //getting the first to the last
        // var first = thumblist.splice(0, 1);
        // thumblist.push(first);
        // }
        thumblist.each(function (thumbnail) {
            //preloading thumbs
            if (settings.preloadImages) {
                var thumb_options = new Object();
                thumb_options = Object.extend(eval("(" + this.trim(thumbnail.readAttribute('rel')) + ")"), thumb_options || {});
                thumb_preload[i] = new Image();
                thumb_preload[i].src = thumb_options.largeimage;
                i++;
            }
            thumbnail.observe(this.settings.thumbnailChange, function (e) {
                if($(thumbnail).hasClassName('zoomThumbActive')){
                    return false;
                }
                thumblist.each(function (thumb) {
                    $(thumb).removeClassName('zoomThumbActive');
                });
                e.preventDefault();
                this.swapimage(thumbnail);
                return false;
            }.bind(this));
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
        this.el.zoom_active = false;
    },
    swapimage: function (link) {
        this.el.largeimageloading = false;
        this.el.largeimageloaded = false;
        var options = new Object();
        options = Object.extend(eval("(" + this.trim(link.readAttribute('rel')) + ")"), options || {});
        if (options.smallimage && options.largeimage) {
            var smallimage = options.smallimage;
            var largeimage = options.largeimage;
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
        return str.trim();
    },

    _continueMove : function() {
        this.largeimage.setposition()
    },
    _drag : function (event) {
        var relatedTarget = $(event.relatedTarget || event.toElement);
        if (relatedTarget != event.currentTarget && (relatedTarget.childOf(event.currentTarget) == false)) {
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
        }
    }
};
