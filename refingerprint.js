/*
 * Refingerprint 0.1
 * A refined browser fingerprinting library based on Fingerprint2.
 *
 * Copyright (c) 2016
 * Nicolò Andronio @ .Cleafy (nicolo.andronio@cleafy.com)
 *
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL VALENTIN VASILYEV BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function (name, context, definition) {
    "use strict";
    if ((typeof module !== "undefined") && module.exports) { module.exports = definition(); }
    else if ((typeof define === "function") && define.amd) { define(definition); }
    else { context[name] = definition(); }
})("Refingerprint", this, function () {
    "use strict";

    // Support for array map-reduce and enumeration

    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function (f) {
            for (var i = 0; i < this.length; ++i)
                f(this[i]);
        };
    }

    if (!Array.prototype.map) {
        Array.prototype.map = function (f) {
            var r = [];
            for (var i = 0; i < this.length; ++i)
                r[i] = f(this[i]);
            return r;
        };
    }

    if (!Array.prototype.filter) {
        Array.prototype.filter = function (f) {
            var r = [];
            for (var i = 0; i < this.length; ++i)
                if (f(this[i]))
                    r[i] = this[i];
            return r;
        };
    }

    if (!Object.keys) {
        Object.keys = function (object) {
            var keys = [];

            for (var key in object)
                keys.push(key);

            return keys;
        };
    }

    // Native functions detections
    // Courtesy of https://davidwalsh.name/detect-native-function
    
    var isNative = (function () {
        var toString = Object.prototype.toString;
        var fnToString = Function.prototype.toString;
        var reHostCtor = /^\[object .+?Constructor\]$/;

        var reNative = RegExp('^' +
            String(toString)
                .replace(/[.*+?^${}()|[\]\/\\]/g, '\\$&')
                .replace(/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
        );

        return function (value) {
            var type = typeof value;
            return type == 'function'
                ? reNative.test(fnToString.call(value))
                : (value && type == 'object' && reHostCtor.test(toString.call(value))) || false;
        };
    })();

    // Helpers

    function keysOf(obj) {
        var keys = [];
        var addUniqueKey = function (key) {
            if (keys.indexOf(key) < 0)
                keys.push(key);
        };

        // It happens that certain object keys are enumerated only through a call to
        // Object.keys or Object.getOwnPropertyNames. Some other times, keys that are enumerable in
        // a for loop are not exposed through these functions. Therefore we take the
        // results of every possible enumeration to be safe

        if (Object) {
            if (Object.getOwnPropertyNames)
                Object.getOwnPropertyNames(obj).forEach(addUniqueKey);

            if (Object.keys)
                Object.keys(obj).forEach(addUniqueKey);
        }

        for (var key in obj)
            addUniqueKey(key);

        return keys;
    }

    function membersOf(obj) {
        var result = {
            functions: [],
            types: [],
            fields: []
        };
        var isConstructor = function (functionName) {
            return (functionName.length > 1) &&
                (functionName.charAt(0) == functionName.charAt(0).toUpperCase()) &&
                isNaN(parseInt(functionName.charAt(0), 10));
        };

        keysOf(obj).forEach(function (key) {
            var value = obj[key];

            if (('function' === typeof value) && isNative(value)) {
                if (isConstructor(key))
                    result.types.push(key);
                else
                    result.functions.push(key);
            } else {
                result.fields.push(key);
            }
        });

        result.functions.sort();
        result.types.sort();
        result.fields.sort();

        return result;
    }

    function errorOf(e) {
        var error = "";

        if ('string' == typeof e)
            error = e;
        else if (e.message && ('string' == typeof e.message))
            error = e.message;
        else if (e.description && ('string' == typeof e.description))
            error = e.description;
        else if (e.toString && ('function' == typeof e.toString))
            error = e.toString();

        return error;
    }

    function stringifyArray(array) {
        return array.join(';');
    }

    function stringifyObject(object) {
        return Object.keys(object)
            .map(function (key) { return (key + '=' + object[key]); })
            .join(';');
    }

    function stringifyMembers(membersDump) {
        // stringifyArray(membersDump.fields) excluded since they are more tamperable
        return stringifyArray(membersDump.types) + ";" + stringifyArray(membersDump.functions);
    }

    function snakeToPascal(str) {
        return str.split("_")
            .map(function (chunk) {
                if (chunk.length < 2)
                    return chunk.charAt(0).toUpperCase();
                else
                    return chunk.charAt(0).toUpperCase() + chunk.substring(1).toLowerCase();
            })
            .join("");
    }

    // Detection modules

    var emptyDetection = {
        result: [],
        raw: ""
    };
    var syncModules = [
        {
            name: "literal_colors",
            detect: function (options) {
                var result = { };
                var colors = [
                    'ActiveBorder', 'ActiveCaption', 'AppWorkspace', 'Background', 'ButtonFace', 'ButtonHighlight',
                    'ButtonShadow', 'ButtonText', 'CaptionText', 'GrayText', 'Highlight', 'HighlightText', 'InactiveBorder',
                    'InactiveCaption', 'InactiveCaptionText', 'InfoBackground', 'InfoText', 'Menu', 'MenuText', 'Scrollbar',
                    'ThreeDDarkShadow', 'ThreeDFace', 'ThreeDHighlight', 'ThreeDLightShadow', 'ThreeDShadow',
                    'Window', 'WindowFrame', 'WindowText'
                ];

                colors.forEach(function (color) {
                    var span = document.createElement('span');
                    span.setAttribute('style', 'background-color: ' + color);
                    document.body.appendChild(span);

                    var style = window.getComputedStyle ? window.getComputedStyle(span) : span.currentStyle;
                    result[color] = style.backgroundColor;

                    document.body.removeChild(span);
                });

                return {
                    result: result,
                    raw: stringifyObject(result)
                };
            }
        },
        {
            name: "activex_objects",
            detect: function (options) {
                var componentConstructor = window.ActiveXObject || window.GeckoActiveXObject || null;

                if (!componentConstructor)
                    return emptyDetection;

                var result = [];
                var components = [
                    "Agent.Control.1", "Agent.Control.2", "Alttiff.AlternaTIFF ActiveX.1", "Alttiff.AlternaTIFF ActiveX.1",
                    "ComCtl2.Animation.1", "MSScriptControl.ScriptControl.1", "Adobe.SVGCtl", "IPIX.ActiveXCtrl.5", "AxMetaStream.MetaStreamCtl.1",
                    "Autodesk.MGMap.1", "Autodesk.MGMap.1", "Wfica.WficaCtl.1", "Citrix.ICAClient", "Microsoft.XMLDOM", "Msxml2.DOMDocument",
                    "Msxml2.DOMDocument.2.6", "Msxml2.DOMDocument.3.0", "Msxml2.DOMDocument.4.0", "JavaSoft.JavaBeansBridge.1", "Messenger.MsgrObject",
                    "SealedMedia.UnsealerPlugin.1", "Cycore.Cult3D", "Outc.TC.1", "OPUCatalog.OPUCatalog.1", "IUCtl.Update.1", "DANSKESIKKER.DanskeSikkerCtrl.1",
                    "MediaPlayer.MediaPlayer.1", "WMPlayer.OCX.7", "{22D6F312-B0F6-11D0-94AB-0080C74C7E95}"
                ];
                var canCreate = function (component) {
                    try {
                        return new componentConstructor(component);
                    } catch (e) {
                        return false;
                    }
                };

                components.forEach(function (component) {
                    if (canCreate(component)) result.push(component);
                });

                if (window.GeckoActiveXObject)
                    result.push("GeckoActiveX");

                result.sort();

                return {
                    result: result,
                    raw: stringifyArray(result)
                };
            }
        },
        {
            name: "ms_components",
            detect: function (options) {
                var div = document.createElement("div");
                div.innerHTML = "<div style='behavior:url(#default#clientCaps)' ID='tempCompChecker' ></div>";
                document.body.appendChild(div);

                if (('undefined' === typeof tempCompChecker) || ('undefined' === typeof tempCompChecker.isComponentInstalled)) {
                    document.body.removeChild(div);
                    return emptyDetection;
                }

                var result = [];
                var components = [
                    ["AOL ART Image Format Support", "{47F67D00-9E55-11D1-BAEF-00C04FC2D130}"],
                    ["Address Book", "{7790769C-0471-11D2-AF11-00C04FA35D02}"],
                    ["Arabic Text Display Support", "{76C19B38-F0C8-11CF-87CC-0020AFEECF20}"],
                    ["Chinese (Simplified) Text Display Support", "{76C19B34-F0C8-11CF-87CC-0020AFEECF20}"],
                    ["Chinese (Traditional) Text Display Support", "{76C19B33-F0C8-11CF-87CC-0020AFEECF20}"],
                    ["DirectAnimation Java Classes", "{4F216970-C90C-11D1-B5C7-0000F8051515}"],
                    ["DirectAnimation", "{283807B5-2C60-11D0-A31D-00AA00B92C03}"],
                    ["DirectShow", "{44BBA848-CC51-11CF-AAFA-00AA00B6015C}"],
                    ["Dynamic HTML Data Binding for Java", "{4F216970-C90C-11D1-B5C7-0000F8051515}"],
                    ["Dynamic HTML Data Binding", "{9381D8F2-0288-11D0-9501-00AA00B911A5}"],
                    ["Hebrew Text Display Support", "{76C19B36-F0C8-11CF-87CC-0020AFEECF20}"],
                    ["Internet Connection Wizard", "{5A8D6EE0-3E18-11D0-821E-444553540000}"],
                    ["Internet Explorer Web Browser", "{89820200-ECBD-11CF-8B85-00AA005B4383}"],
                    ["Internet Explorer Browsing Enhancements", "{630B1DA0-B465-11D1-9948-00C04F98BBC9}"],
                    ["Internet Explorer Classes for Java", "{08B0E5C0-4FCB-11CF-AAA5-00401C608555}"],
                    ["Internet Explorer Help Engine", "{DE5AED00-A4BF-11D1-9948-00C04F98BBC9}"],
                    ["Internet Explorer Help", "{45EA75A0-A269-11D1-B5BF-0000F8051515}"],
                    ["Internet Explorer Web Browser", "{89820200-ECBD-11CF-8B85-00AA005B4383}"],
                    ["Japanese Text Display Support", "{76C19B30-F0C8-11CF-87CC-0020AFEECF20}"],
                    ["Korean Text Display Support", "{76C19B31-F0C8-11CF-87CC-0020AFEECF20}"],
                    ["Language Auto-Selection", "{76C19B50-F0C8-11CF-87CC-0020AFEECF20}"],
                    ["Macromedia Flash", "{D27CDB6E-AE6D-11CF-96B8-444553540000}"],
                    ["Macromedia Shockwave Director", "{2A202491-F00D-11CF-87CC-0020AFEECF20}"],
                    ["Microsoft virtual machine", "{08B0E5C0-4FCB-11CF-AAA5-00401C608500}"],
                    ["NetMeeting NT", "{44BBA842-CC51-11CF-AAFA-00AA00B6015B}"],
                    ["Offline Browsing Pack", "{3AF36230-A269-11D1-B5BF-0000F8051515}"],
                    ["Outlook Express", "{44BBA840-CC51-11CF-AAFA-00AA00B6015C}"],
                    ["Pan-European Text Display Support", "{76C19B32-F0C8-11CF-87CC-0020AFEECF20}"],
                    ["Task Scheduler", "{CC2A9BA0-3BDD-11D0-821E-444553540000}"],
                    ["Thai Text Display Support", "{76C19B35-F0C8-11CF-87CC-0020AFEECF20}"],
                    ["Uniscribe", "{3BF42070-B3B1-11D1-B5C5-0000F8051515}"],
                    ["VRML 2.0 Viewer", "{90A7533D-88FE-11D0-9DBE-0000C0411FC3}"],
                    ["Vector Graphics Rendering (VML)", "{10072CEC-8CC1-11D1-986E-00A0C955B42F}"],
                    ["Vietnamese Text Display Support", "{76C19B37-F0C8-11CF-87CC-0020AFEECF20}"],
                    ["Visual Basic Scripting Support", "{4F645220-306D-11D2-995D-00C04F98BBC9}"],
                    ["Wallet", "{1CDEE860-E95B-11CF-B1B0-00AA00BBAD66}"],
                    ["Web Folders", "{73FA19D0-2D75-11D2-995D-00C04F98BBC9}"],
                    ["Windows Desktop Update NT", "{89820200-ECBD-11CF-8B85-00AA005B4340}"],
                    ["Windows Media Player RealNetwork Support", "{23064720-C4F8-11D1-994D-00C04F98BBC9}"],
                    ["Windows Media Player", "{22D6F312-B0F6-11D0-94AB-0080C74C7E95}"],
                    ["DirectAnimation Java Classes", "{4F216970-C90C-11D1-B5C7-0000F8051515}"],
                    ["DirectAnimation", "{283807B5-2C60-11D0-A31D-00AA00B92C03}"],
                    ["DirectShow", "{44BBA848-CC51-11CF-AAFA-00AA00B6015C}"],
                    ["MediaPlayer9", "{6BF52A52-394A-11d3-B153-00C04F79FAA6}"],
                    ["MediaPlayer6", "{22D6F312-B0F6-11D0-94AB-0080C74C7E95}"]
                ];
                var componentExists = function (cid) {
                    return tempCompChecker.isComponentInstalled(cid, "ComponentID");
                };

                components.forEach(function (info) {
                    if (componentExists(info[1])) result.push(info[0]);
                });

                document.body.removeChild(div);
                result.sort();

                return {
                    result: result,
                    raw: stringifyArray(result)
                };
            }
        },
        {
            name: "navigator_dump",
            detect: function (options) {
                if (typeof navigator === "undefined")
                    return emptyDetection;

                var dump = membersOf(navigator);
                return {
                    result: dump,
                    raw: stringifyMembers(dump)
                };
            }
        },
        {
            name: "toolbar_dump",
            detect: function (options) {
                if (typeof toolbar === "undefined")
                    return emptyDetection;

                var dump = membersOf(toolbar);
                return {
                    result: dump,
                    raw: stringifyMembers(dump)
                };
            }
        },
        {
            name: "crypto_dump",
            detect: function (options) {
                if (typeof crypto === "undefined")
                    return emptyDetection;

                var dump = membersOf(crypto);
                return {
                    result: dump,
                    raw: stringifyMembers(dump)
                };
            }
        },
        {
            name: "window_dump",
            detect: function (options) {
                if (typeof window === "undefined")
                    return emptyDetection;

                var dump = membersOf(window);
                return {
                    result: dump,
                    raw: stringifyMembers(dump)
                };
            }
        },
        {
            name: "document_dump",
            detect: function (options) {
                if (typeof document === "undefined")
                    return emptyDetection;

                var dump = membersOf(document);
                return {
                    result: dump,
                    raw: stringifyMembers(dump)
                };
            }
        },
        {
            name: "style_dump",
            detect: function (options) {
                var div = document.createElement("div");
                var result = Object.keys(div.style);
                result.sort();
                return {
                    result: result,
                    raw: stringifyArray(result)
                };
            }
        },
        {
            name: "error_messages",
            detect: function (options) {
                // We use eval to support IE6. Otherwise the file won't be interpreted
                var offendingFunctions = [
                    function () {
                        // Accessing property of undefined object
                        eval("var something; var whatever = something.else;");
                    },
                    function () {
                        // Treating non-functions like functions
                        eval("var number = 42; number();");
                    },
                    function () {
                        // Using r-values instead of l-values
                        eval("var f = function () { return 0; }; f() = 1;");
                    },
                    function () {
                        // Serializing a circular reference
                        eval("var a = { }; var b = { a: a }; a.b = b; JSON.stringify(a);");
                    },
                    function () {
                        // Unexpected tokens
                        eval("var a = 1[");
                    },
                    function () {
                        // Infinitely recursive call
                        eval("var f = function () { f(); }; f();");
                    }
                ];
                var diagnose = function (offendingFunction) {
                    try {
                        offendingFunction();
                    } catch (e) {
                        return errorOf(e);
                    }
                };
                var result = offendingFunctions.map(function (f) {
                    return diagnose(f);
                });

                return {
                    result: result,
                    raw: stringifyArray(result)
                };
            }
        }
    ];
    var asyncModules = [
        {
            name: "images_formats",
            detect: function (options, done) {
                var counter = 0;
                var result = [];
                var extensions = [
                    ".bmp", ".fli", ".gif", ".ico", ".jpg", ".mng", ".pbm", ".pcx", ".pgm", ".png",
                    ".ppm", ".tga", ".tif", ".xbm"
                ];
                var checkProgress = function () {
                    if (++counter == extensions.length) {
                        done({
                            result: result,
                            raw: stringifyArray(result)
                        });
                    }
                };

                extensions.forEach(function (ext) {
                    var img = document.createElement("img");
                    img.setAttribute("src", (options.imagesPath || "images/test") + ext);
                    img.onload = function () {
                        result.push(ext);
                        document.body.removeChild(img);
                        checkProgress();
                    };
                    img.onerror = function () {
                        document.body.removeChild(img);
                        checkProgress();
                    };
                    document.body.appendChild(img);
                });
            }
        }
    ];

    // Constructor
    return function (options) {
        var fp2 = new Fingerprint2(options);

        this.get = function (done) {
            fp2.get(function (result, components) {
                var temp = "";

                // Execute all enabled synchronous modules
                syncModules.filter(function (syncModule) {
                    return !options["exclude" + snakeToPascal(syncModule.name)];
                }).forEach(function (syncModule) {
                    try {
                        var detection = syncModule.detect(options);
                        temp += detection.raw;
                        components.push({ key: syncModule.name, value: detection.result });
                    } catch (e) {
                        var error = errorOf(e);
                        temp += error;
                        components.push({ key: syncModule.name, value: error });
                    }
                });

                // This function simply calls the done callback with the actual
                // result of the detections
                var finalize = function () {
                    done(result + fp2.x64hash128(temp, 31), components);
                };

                var enabledAsyncModules = asyncModules.filter(function (asyncModule) {
                    return !options["exclude" + snakeToPascal(asyncModule.name)];
                });

                if (enabledAsyncModules.length == 0) {
                    finalize();
                } else {
                    // Call all asynchronous modules sequentially through a sort of continuation
                    var index = 0;
                    var continuation = function (detection) {
                        temp += detection.raw;
                        components.push({ key: enabledAsyncModules[index].name, value: detection.result });

                        if (++index == enabledAsyncModules.length)
                            return finalize();

                        try {
                            enabledAsyncModules[index].detect(options, continuation);
                        } catch (e) {
                            var error = errorOf(e);
                            continuation({ result: error, raw: error });
                        }
                    };

                    try {
                        enabledAsyncModules[index].detect(options, continuation);
                    } catch (e) {
                        var error = errorOf(e);
                        continuation({ result: error, raw: error });
                    }
                }
            });
        };
    };
});