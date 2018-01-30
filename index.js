var Path = {
    make: function (path, key) {
        return (path + '.' + key).trim().replace(/^\.+/, '.')
    },
    match: function (paths, path) {
        if (paths)
            for (let i = 0; i < paths.length; i++)
                if ((paths[i].test && paths[i].test(path)) || paths[i] == path)
                    return true;
    },
    replace: function (path, key, replacements) {
        if (replacements)
            for (let i = 0; i < replacements.length; i++) {
                if ((replacements[i].path.test && replacements[i].path.test(path)) || replacements[i].path == path) {
                    if (replacements[i].key.test(key)) {
                        key = key.replace(replacements[i].key, replacements[i].replace)
                        if (replacements[i].stop)
                            return key;
                    } else if (replacements[i].key == key) {
                        key = replacements[i].replace;
                        if (replacements[i].stop)
                            return key;
                    }
                }
            }
        return key;
    }

}
function Main(object, options) {
    options = options || {};
    var dictionary = Object.create(null);
    var root = lookup('');
    join(root, '', '.', object)
    function traverse(jsonpath, path, object) {
        if (Array.isArray(object)) {
            for (let i = 0; i < object.length; i++) {
                join(jsonpath, path, '[]', object[i])
            }
        } else if (typeof object == 'object') {
            for (const key in object) {
                join(jsonpath, path, key, object[key])
            }
        }
    }
    function join(jsonpath, path, key, object) {
        path = Path.make(path, key);
        var child = lookup(path);
        child.addValue(object)
        jsonpath.addChild(key, child);
        traverse(child, path, object);
    }
    function lookup(path) {
        if (!dictionary[path])
            dictionary[path] = new JSONPath();
        return dictionary[path];
    }
    return root;
}

function JSONPath() {
    this._types = Object.create(null);
    this._keys = Object.create(null)
    this._values = Object.create(null);
    this._children = Object.create(null)
    this._parent = null;
}

JSONPath.prototype.addValue = function (value) {
    if (Array.isArray(value)) {
        this._types.array = true;
        return;
    }
    switch (typeof value) {
        case 'object':
            if (value === null)
                return this._types.null = true;
            break;
        case 'string':
        case 'number':
            this._values[value] = true;
            if (/^\d+$/.test(value)) {
                this._types[(typeof value) + '-int'] = true;
                return;
            }
            if (/^\d*\.\d+$/.test(value)) {
                this._types[(typeof value) + '-decimal'] = true;
                return;
            }
            break;
        default:
            break;
    }
    this._types[(typeof value)] = true;
}
JSONPath.prototype.addChild = function (key, object) {
    if (JSONPath.prototype.isPrototypeOf(object))
        if (!this._children[key])
            this._children[key] = object;
        else {
            this._children[key].merge(object);
        }
}

JSONPath.prototype.children = function (limit) {
    return Subset(this, '_children', limit);
}
JSONPath.prototype.types = function (limit) {
    return Subset(this, '_types', limit);
}
JSONPath.prototype.keys = function (limit) {
    return Subset(this, '_keys', limit);
}
JSONPath.prototype.values = function (limit) {
    return Subset(this, '_values', limit);
}

JSONPath.prototype.merge = function (obj) {
    if (!JSONPath.prototype.isPrototypeOf(obj))
        return;
    for (const key in obj._types) {
        this._types[key] = true;
    }
    for (const key in obj._values) {
        this._values[key] = true;
    }
    for (const key in obj._keys) {
        this._keys[key] = true;
    }
    for (const key in obj._children) {
        this.addChild(key, obj._children[key])
    }
}
JSONPath.prototype.reduce = function (options) {
    var reduced = Reduce(this, '', options);
    while (reduced) {
        reduced = Reduce(this, '', options);
    }
    return this;
}

JSONPath.prototype.get = function (target) {
    return Get(this, '', target);
}

JSONPath.prototype.list = function (options) {
    options = options || Object.create(null)
    var obj = List(this, '', options);
    if (Object.keys(options).filter((n) => ['values', 'types', 'keys', 'children'].includes(n)).length)
        return obj;
    return Object.keys(obj);
}


function Subset(jsonpath, key, limit) {
    var keys = Object.keys(jsonpath[key]);
    limit = typeof limit == 'number' ? limit : 0;
    limit = limit || keys.length;
    if (keys.length <= limit) {
        return keys;
    }
    var mod = Math.floor(keys.length / limit)
    return keys.filter((v, i) => i % mod == 0).slice(0, limit - 1)
}
function Reduce(jsonpath, path, options) {
    console.log(path, Path.match(options.match, path))
    var reduced = false;
    if (jsonpath.children().length >= options.keylimit || Path.match(options.match, path)) {
        var combine = new JSONPath();
        combine._types.dictionary = true;
        var ary = jsonpath._children['[]'];
        for (const key in jsonpath._children) {
            if (key != '[]') {
                combine._keys[key] = true;
                combine.merge(jsonpath._children[key]);
            }
        }
        jsonpath._children = {
            '{}': combine
        }
        if (ary)
            jsonpath._children['[]'] = ary;
    }
    
    for (var key in jsonpath._children) {
        var usekey = Path.replace(path, key, options.replace);
        if (usekey != key) {
            jsonpath._children[usekey] = jsonpath._children[usekey] || (new JSONPath());
            jsonpath._children[usekey].merge(jsonpath._children[key]);
            delete jsonpath._children[key];
        }
        reduced = reduced || Reduce(jsonpath._children[usekey], Path.make(path, usekey), options);
    }
    return reduced;
}
function Get(jsonpath, path, target) {
    for (const key in jsonpath._children) {
        if (Path.make(path, key) == target)
            return jsonpath._children[key];
        if (target.indexOf(Path.make(path, key + '.')) === 0)
            return Get(jsonpath._children[key], Path.make(path, key), target);
    }
}
function List(jsonpath, path, options) {
    var obj = Object.create(null);
    path = path || '';
    for (const key in jsonpath._children)
        if (!options.ignore || !Path.match(options.ignore, Path.make(path, key))) {
            obj[Path.make(path, key)] = describe(jsonpath._children[key]);
            obj = Object.assign(obj, List(jsonpath._children[key], Path.make(path, key), options))

        }

    function describe(obj) {
        var d = Object.create(null)
        if ((options.values || typeof options.values == 'number') && obj.values().length)
            d.values = obj.values(options.values);
        if ((options.types || typeof options.types == 'number') && obj.types().length)
            d.types = obj.types(options.types);
        if ((options.keys || typeof options.keys == 'number') && obj.keys().length)
            d.keys = obj.keys(options.keys);
        if ((options.children || typeof options.children == 'number') && obj.children().length)
            d.children = obj.children(options.children);
        return d;
    }
    return obj;
}

module.exports = Main;
