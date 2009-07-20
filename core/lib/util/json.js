/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 *
 */

//#ifdef __WITH_JSON2XML
/**
 * Creates xml nodes from an JSON string/ object recursively.
 *
 * @param {String}  strJson     the JSON definition.
 * @param {Boolean} [noError]  whether an exception should be thrown by the parser when the xml is not valid.
 * @param {Boolean} [preserveWhiteSpace]  whether whitespace that is present between XML elements should be preserved
 * @return {XMLNode} the created xml document (NOT the root-node).
 */
apf.json2Xml = (function(){
    var jsonToXml = function (v, name) {
        var i, n, xml = [];
        name = name.replace(/[^a-zA-z0-9_-]+/g, "_");
        if (apf.isArray(v)) {
            for (i = 0, n = v.length; i < n; i++)
                xml.push(jsonToXml(v[i], name));
        }
        else if (typeof v == "object") {
            var hasChild = false;
            xml.push("<", name);
            for (i in v) {
                if (i.charAt(0) == "@")
                    xml.push(" ", i.substr(1), "=\"", v[i].toString(), "\"");
                else
                    hasChild = true;
            }
            xml.push(hasChild ? ">" : "/>");
            if (hasChild) {
                for (i in v) {
                    if (i == "#text")
                        xml.push(v[i]);
                    else if (i == "#cdata")
                        xml.push("<![CDATA[", v[i], "]]>");
                    else if (i.charAt(0) != "@")
                        xml.push(jsonToXml(v[i], i));
                }
                xml.push("</", name, ">");
            }
        }
        else
            xml.push("<", name, ">", v.toString().escapeHTML(), "</", name, ">");
    
        return xml.join("");
    }
        
    return function(strJson, noError, preserveWhiteSpace) {
        var o   = (typeof strJson == "string" && apf.isJson(strJson))
          ? JSON.parse(strJson)//eval("(" + strJson + ")")
          : strJson,
            xml = [], i;
        for (i in o)
            xml.push(jsonToXml(o[i], i, ""));
        return apf.getXmlDom("<jsonroot>" + xml.join("").replace(/\t|\n/g, "") 
            + "</jsonroot>", noError, preserveWhiteSpace);
    };
})();
//#endif

//#ifdef __WITH_JSON_API
/**
 * Reliably determines whether a variable is a string of JSON.
 * @see http://json.org/
 *
 * @param {mixed}   value The variable to check
 * @type  {Boolean}
 */
apf.isJson = (function() {
    var escapes  = /\\["\\\/bfnrtu]/g,
        values   = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
        brackets = /(?:^|:|,)(?:\s*\[)+/g,
        invalid  = /^[\],:{}\s]*$/;

    return function(value) {
        if (!value) return false;
        return invalid.test(
            value.replace(escapes, '@').replace(values, ']').replace(brackets, '')
        );
    }
})();

if (!window["JSON"]) {
    window["JSON"] = {};
    JSON.parse = (function() {
        // Will match a value in a well-formed JSON file.
        // If the input is not well-formed, may match strangely, but not in an
        // unsafe way.
        // Since this only matches value tokens, it does not match whitespace,
        // colons, or commas.
        // The second line of the regex string matches numbers, lines number 4,
        // 5 and 6 match a string and line number 5 specifically matches one
        // character.
        var jsonToken       = new RegExp(
'(?:false|true|null|[\\{\\}\\[\\]]|\
(?:-?\\b(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?\\b)\
|\
(?:\"\
(?:[^\\0-\\x08\\x0a-\\x1f\"\\\\]|\\\\(?:[\"/\\\\bfnrt]|u[0-9A-Fa-f]{4}))\
*\"))', "g"),
            // Matches escape sequences in a string literal
            escapeSequence  = new RegExp("\\\\(?:([^u])|u(.{4}))", "g"),
            // Decodes escape sequences in object literals
            escapes         = {
                "\"": "\"",
                "/": "/",
                "\\": "\\",
                "b": "\b",
                "f": "\f",
                "n": "\n",
                "r": "\r",
                "t": "\t"
            },
            unescapeOne     = function(_, ch, hex) {
                return ch ? escapes[ch] : String.fromCharCode(parseInt(hex, 16));
            },
            // A non-falsy value that coerces to the empty string when used as a key.
            EMPTY_STRING    = new String(""),
            SLASH           = "\\",
            // Constructor to use based on an open token.
            firstTokenCtors = { "{": Object, "[": Array },
            hop             = Object.hasOwnProperty;

        return function (json, opt_reviver) {
            // Split into tokens
            var toks = json.match(jsonToken),
                // Construct the object to return
                result;
            var tok  = toks[0];
            if ("{" == tok)
                result = {};
            else if ("[" == tok)
                result = [];
            else
                throw new Error(tok);

            // If undefined, the key in an object key/value record to use for the next
            // value parsed.
            var key, cont,
                stack = [result];
            // Loop over remaining tokens maintaining a stack of uncompleted objects and
            // arrays.
            for (var i = 1, n = toks.length; i < n; ++i) {
                tok = toks[i];
                switch (tok.charCodeAt(0)) {
                    default:  // sign or digit
                        cont = stack[0];
                        cont[key || cont.length] = +(tok);
                        key = void 0;
                        break;
                    case 0x22:  // '"'
                        tok = tok.substring(1, tok.length - 1);
                        if (tok.indexOf(SLASH) !== -1) {
                            tok = tok.replace(escapeSequence, unescapeOne);
                        }
                        cont = stack[0];
                        if (!key) {
                            if (cont instanceof Array) {
                                key = cont.length;
                            }
                            else {
                                key = tok || EMPTY_STRING;  // Use as key for next value seen.
                                break;
                            }
                        }
                        cont[key] = tok;
                        key = void 0;
                        break;
                    case 0x5b:  // '['
                        cont = stack[0];
                        stack.unshift(cont[key || cont.length] = []);
                        key = void 0;
                        break;
                    case 0x5d:  // ']'
                        stack.shift();
                        break;
                    case 0x66:  // 'f'
                        cont = stack[0];
                        cont[key || cont.length] = false;
                        key = void 0;
                        break;
                    case 0x6e:  // 'n'
                        cont = stack[0];
                        cont[key || cont.length] = null;
                        key = void 0;
                        break;
                    case 0x74:  // 't'
                        cont = stack[0];
                        cont[key || cont.length] = true;
                        key = void 0;
                        break;
                    case 0x7b:  // '{'
                        cont = stack[0];
                        stack.unshift(cont[key || cont.length] = {});
                        key = void 0;
                        break;
                    case 0x7d:  // '}'
                        stack.shift();
                        break;
                }
            }
            // Fail if we've got an uncompleted object.
            if (stack.length)
                throw new Error();

            if (opt_reviver) {
                // Based on walk as implemented in http://www.json.org/json2.js
                var walk = function(holder, key) {
                    var value = holder[key];
                    if (value && typeof value == "object") {
                        var toDelete = null;
                        for (var k in value) {
                            if (hop.call(value, k) && value !== holder) {
                                // Recurse to properties first.  This has the effect of causing
                                // the reviver to be called on the object graph depth-first.
                                // Since 'this' is bound to the holder of the property, the
                                // reviver can access sibling properties of k including ones
                                // that have not yet been revived.
                                // The value returned by the reviver is used in place of the
                                // current value of property k.
                                // If it returns undefined then the property is deleted.
                                var v = walk(value, k);
                                if (v !== void 0) {
                                    value[k] = v;
                                }
                                else {
                                    // Deleting properties inside the loop has vaguely defined
                                    // semantics in ES3 and ES3.1.
                                    if (!toDelete)
                                        toDelete = [];
                                    toDelete.push(k);
                                }
                            }
                        }
                        if (toDelete) {
                            for (var i = toDelete.length; --i >= 0;)
                                delete value[toDelete[i]];
                        }
                    }
                    return opt_reviver.call(holder, key, value);
                };
                result = walk({ "": result }, "");
            }
            return result;
        };
    })();
}

// Serialize Objects
/**
 * @private
 */
apf.JSONSerialize = {
    object: function(o){
        //XML support - NOTICE: Ajax.org Platform specific
        if (o.nodeType && o.cloneNode)
            return "apf.xmldb.getXml("
                + this.string(apf.getXmlString(o)) + ")";

        //Normal JS object support
        var str = [];
        for (var prop in o) {
            str.push('"' + prop.replace(/(["\\])/g, '\\$1') + '": '
                + apf.serialize(o[prop]));
        }

        return "{" + str.join(", ") + "}";
    },

    string: function(s){
        s = '"' + s.replace(/(["\\])/g, '\\$1') + '"';
        return s.replace(/(\n)/g, "\\n").replace(/\r/g, "");
    },

    number: function(i){
        return i.toString();
    },

    "boolean": function(b){
        return b.toString();
    },

    date: function(d){
        var padd = function(s, p){
            s = p + s;
            return s.substring(s.length - p.length);
        };
        var y   = padd(d.getUTCFullYear(), "0000");
        var m   = padd(d.getUTCMonth() + 1, "00");
        var D   = padd(d.getUTCDate(), "00");
        var h   = padd(d.getUTCHours(), "00");
        var min = padd(d.getUTCMinutes(), "00");
        var s   = padd(d.getUTCSeconds(), "00");

        var isodate = y + m + D + "T" + h + ":" + min + ":" + s;

        return '{"jsonclass":["sys.ISODate", ["' + isodate + '"]]}';
    },

    array: function(a){
        for (var q = [], i = 0; i < a.length; i++)
            q.push(apf.serialize(a[i]));

        return "[" + q.join(", ") + "]";
    }
};

/**
 * Creates a json string from a javascript object.
 * @param {mixed} the javascript object to serialize.
 * @return {String} the json string representation of the object.
 * @todo allow for XML serialization
 */
apf.serialize = function(args){
    if (typeof args == "function" || apf.isNot(args))
        return "null";
    return apf.JSONSerialize[args.dataType || "object"](args);
};

/**
 * Evaluate a serialized object back to JS with eval(). When the 'secure' flag
 * is set to 'TRUE', the provided string will be validated for being valid
 * JSON.
 *
 * @param {String}  str     the json string to create an object from.
 * @param {Boolean} secure  whether the json string should be checked to prevent malice.
 * @return {Object} the object created from the json string.
 */
apf.unserialize = function(str, secure){
    if (!str) return str;
    if (secure && !(/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/)
      .test(str.replace(/\\./g, '@').replace(/"(?:\\"|[^"])*"|'(?:\\'|[^'])*'/g, '')))
        return str;
    return eval('(' + str + ')');
};

// #endif