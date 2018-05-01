(function(exports){


//------------------------ 路由 -------------------------------------

//用于绑定事件
var listener = {
	init:function(fn){
		if('onhashchange' in window 
			&& (document.documentMode > 7 || document.documentMode === undefined) ){
			window.onhashchange = fn;
		}else{

		}
	}
}

var unNestedRoutes = [];

var Router = exports.Router = function(routes){
	this.routes = {}; //路由表
	this.methods  = ['on', 'after', 'before']; //生命周期
	this.config();
	this.mount(routes);
}

Router.prototype.config = function(){
	this._methods = {};
	for(var i=0,l=this.methods.length;i<l;i++){
		var m = this.methods[i];
		this._methods[m] = true;
	}
}

/*
	第一次，routes为路由配置对象，objPath为undefined
	递归时，可能的值为：routes为{on:func,after:func},objPath为对应的路径，如'/home'
*/
Router.prototype.mount = function(routes, parentPath){
	if(!routes || typeof routes !== 'object' || Array.isArray(routes) ){
		return;
	}
	var that = this,
		parentPath = parentPath || [];

	function insertOrMount(path,route,parentPath){
		//如果是这种形式："/home/detail"，那么 /home/detail 与 /home 是独立的
		if(path.split('/').length>2){
			unNestedRoutes[path]=true;
		}

		/*
			参数 path 可能是路径如"/home",
			也可能是生命周期如"on"、"before"、"after"
		*/
		var isRoute = ( path.split('/')[0]==='' ),
			routeType = typeof route,
			method = isRoute?'on':path;

		if(isRoute){
			path = parentPath.concat( path.split('/') );
			path = path.filter(Boolean)
		}

		// 是 路径=>Function 的情况时，直接插入，生命周期默认只有 on
		if(isRoute && routeType==='function'){
			that.insert( path, method, route );
			return;
		}

		// 是 路径=>Object 的情况时，递归 mount()
		if(isRoute && routeType==='object' && !Array.isArray(route)){
			// 此时 route 是一个对象如 {before:func,on:func}
			that.mount( route, path);
			return;
		}

		//是生命周期=>function的情况时（如："on":function）
		if(!isRoute && routeType==='function'){
			that.insert( parentPath, method, route );
			return;
		}
	}

	for(var path in routes){
		if(routes.hasOwnProperty(path)){
			insertOrMount(path, routes[path], parentPath.slice(0));
		}
	}
}

//构建路由表
Router.prototype.insert = function(path,method,fn,parentRoute){
	var route = parentRoute ? parentRoute : this.routes,
		pathPart = path.shift();

	// 带:号，如 :id
	if( /\:/.test(pathPart) ){
		pathPart = '([._a-zA-Z0-9-%()]+)';
	}

	if(path.length>0){
		route[pathPart] = route[pathPart] || {};
		this.insert(path,method,fn,route[pathPart]);
		return;
	}

	if(route[pathPart]){
		route[pathPart][method] = fn;
	}else{
		var nested = {};
		nested[method] = fn;
		route[pathPart] = nested;
	}
}

//绑定 hashchange 事件
Router.prototype.init = function(r){
	var that = this;
	that.hanlder = function(onChangeEvent){
		var newURL = onChangeEvent && onChangeEvent.newURL || window.location.hash;
    	var path = newURL.replace(/.*#/, ''); // 如将 "http://localhost/index#/home" => "home"
		that.dispatch(path);
	}
	listener.init(that.hanlder);
	if(document.location.hash === '' && r){
		document.location.hash = r;
	}else if(document.location.hash.length > 0){
		that.hanlder();
	}
}

//根据 hash 执行对应的回调事件
//path 为 "/home" 或 "/home/detail"
var toOther=0,toNested=1,toParent=2;
Router.prototype.dispatch = function(path){
	var runList = this.createRunList(path,this.routes);

	//如果是这种形式："/home/detail"，那么 /home/detail 与 /home 是独立的
	if( unNestedRoutes[path] || unNestedRoutes[this.lastPath] ){
		this.invoke(this.last);
		this.invoke(runList);
		this.last = [ runList.after ];
		this.lastPath = path;
		return;
	}

	function typeOfRoute(path,lastPath,parentPath){
		if( lastPath && lastPath === parentPath){
			return toNested;
		}
		else if( lastPath && lastPath.match( new RegExp(path) ) ){
			return toParent;
		}
		else{
			return toOther;
		}
	}

	var type = typeOfRoute(path,this.lastPath,runList.parentPath);

	/*
	 1、跳到嵌套路由时，如："/home"=>"/home/room" 时，不执行 /home 的 after；
	 而是将 /home 的 after 存储起来，若是再从 /home/room => /other, 会依次调用/home/room的after和/home的after
	*/
	if( type === toNested ){
		this.last.unshift( runList.after );
		this.invoke(runList);
	}else if( type === toParent ){
		if( this.last && this.last.length>0) this.invoke( [ this.last.shift() ] );
	}else if( type === toOther ){
		this.invoke(this.last); //调用上次路由的after	
		this.invoke(runList);
		this.last = [ runList.after ];
	}
	this.lastPath = path;

}

//创建执行队列,如：[before,on]
// path 为数组，如 ["home"] 、['home','detail']
Router.prototype.createRunList = function(path,routes,parentReg){

	var _arr = path.split('?');
	var queryBody = _arr[1];
	var query={};
	if( queryBody ){
		path = _arr[0];

		var arr = queryBody.split('&');
		for(var i=0,l=arr.length;i<l;i++){
			var key = arr[i].split('=')[0],
				value = arr[i].split('=')[1];
			query[key] = value;
		}
	}

	
	var runList=[],parentReg = parentReg||'';
	for(var r in routes){
		if(routes.hasOwnProperty(r) && !this._methods[r]){
			var regexp = parentReg+'/'+r;
			var match = path.match( new RegExp('^'+regexp) );
			//未匹配
			if(!match){
				continue;
			}
			//匹配到路径
			if(match[0] && match[0] === path ){
				runList = [ routes[r].before, routes[r].on ].filter(Boolean);
				runList.after = routes[r].after;
				runList.capture = match.slice(1);
				runList.capture.push(query) ;
				runList.parentPath = parentReg;
				return runList;
			}
			//匹配到其父路径，递归
			runList = this.createRunList(path,routes[r],regexp);
			return runList;
		}
	}
	return runList;
}

Router.prototype.invoke = function(array){
	if(!array && !Array.isArray(array) ) return;
	for(var i=0,l=array.length;i<l;i++){
		if(typeof array[i] === "function"){
			array[i].apply(this,array.capture);
		}
	}
}

Router.prototype.goto = function(path,params){
	var queryString = this.toUrlString(params)
	window.location =  '#' + path+queryString;
}
Router.prototype.replace = function(path,params){
	var queryString = this.toUrlString(params)
	window.location.replace('#'+path+queryString);
}
Router.prototype.toUrlString = function(params){
	var string = '?';
	for(var key in params){
		string += key+'='+params[key]+'&';
	}
	string = string.substr(0, string.length-1);
	return string;
}


//------------------------ 载入文本 -------------------------------------

var textCache = {};

var text = window.text = {
    createXhr:function () {
        var xhr, i, progId;
        if (typeof XMLHttpRequest !== "undefined") {
            return new XMLHttpRequest();
        } else if (typeof ActiveXObject !== "undefined") {
            for (i = 0; i < 3; i += 1) {
                progId = progIds[i];
                try {
                    xhr = new ActiveXObject(progId);
                } catch (e) {}

                if (xhr) {
                    progIds = [progId];
                    break;
                }
            }
        }

        return xhr;
    },
    load:function(url,callback,tag){

    	if(textCache[tag]){
    		console.log('get By cache')
    		if(textCache[tag].html){
                var router = document.getElementById('router');
                if(!router) return;
                router.innerHTML = textCache[tag].html;
    		}

    		if(textCache[tag].css){
    			var style = document.getElementById('hspa-current-css');
                if(!style) return;
                style.innerHTML = textCache[tag].css;
    		}

    		if(textCache[tag].jsPath){
    			var srcArr = textCache[tag].jsPath;
    			for(var i=0;i<srcArr.length;i++){
           			var _script = document.createElement('script');
			        _script.charset = 'utf-8';
			        _script.async = true;
			        _script.src = srcArr[i];
			        router.appendChild(_script);
           		}
    		}

    		return;
    	}

        var xhr = text.createXhr();
        xhr.open('GET', url, true);


        xhr.onreadystatechange = function (evt) {
            var status, err;
            if (xhr.readyState === 4) {
                status = xhr.status || 0;
                if (status > 399 && status < 600) {
                    err = new Error(url + ' HTTP status: ' + status);
                    err.xhr = xhr;
                    if (errback) {
                        //errback(err);
                    }
                } else {
                    var content = xhr.responseText;
                    content =  content.replace(/\r\n/g,'');
                    content =  content.replace(/>\s+</g,'><');
                    
                    var htmlRe = /<template>(.*)<\/template>/,
                        cssRe = /<style>(.*)<\/style>/,
                        jsRe = /<script(.*)><\/script>/;

                    var html = content.match(htmlRe)[1],
                        css = content.match(cssRe)[1],
                        //js = content.match(jsRe);
                        jsArr = content.split('<script');
                        jsArr.shift();



                    var router = document.getElementById('router');
                    if(!router) return;
                    router.innerHTML = html;
                    if(!textCache[tag]){
                    	textCache[tag] = {};
                    }
                    textCache[tag].html = html;

                    var style = document.getElementById('hspa-current-css');
                    if(!style) return;
                    style.innerHTML = css;
                    if(!textCache[tag]){
                    	textCache[tag] = {};
                    }
                    textCache[tag].css = css;


                    if(jsArr.length>0){
                    	var _url = url.split('/');
	                    _url.pop();
	                    _url = _url.join('/');

                    	var srcArr = [];
                   		for(var i=0;i<jsArr.length;i++ ){
                   			var r = jsArr[i].match(/src="(.*)"/);
                   			srcArr.push( _url+'/'+r[1] );
                   		}

                   		if(!textCache[tag]){
	                    	textCache[tag] = {};
	                    }
	                    textCache[tag].jsPath = srcArr;
                   		
                   		for(var i=0;i<srcArr.length;i++){
                   			var _script = document.createElement('script');
					        _script.charset = 'utf-8';
					        _script.async = true;
					        _script.src = srcArr[i];
					        router.appendChild(_script);
                   		}
                    }


                    if(typeof callback === 'function'){
                        callback();
                    }

                }


            }
        };
        xhr.send(null);
    }
}

//--------------------------- hspa constructor-------------------------------------



function Hspa(){
	var style = document.createElement('style');
	style.setAttribute('type','text/css');
	style.setAttribute('id','hspa-current-css');
	document.head.appendChild(style);
}

Hspa.prototype.init = function(routes,r){

	var option = this.initRoutes(routes);
	console.log('option',option)
	var router = this.router = new Router(option);
	router.init(r);
}
Hspa.prototype.initRoutes = function(routes){
	var option = {};

	/*
		{
			url:xxx,
			on:xxx
		}
		转为
		{
			on:function(){
				text.load(url);
				xxx
			}
		}
	*/
	function createRoute(obj,key){
		var route = {};
		for(var item in obj){
			if(item==='url') continue;

			// 若是有嵌套路由，递归处理
			if(item.split('/')[0]===''){
				route[item] = createRoute( obj[item],key+item );
				continue;
			}

			if(item==='on'){
				var on = function(key,obj){
					return function(params){
						text.load(obj.url,null,key)
						if(typeof obj.on === 'function'){
							obj.on(params);
						}
					}
				}(key,obj);
				route[item] = on;
				continue
			}

			route[item] = obj[item];
		}
		return route;
	}


	for(var key in routes){

		var value = routes[key];

		//默认添加一个 on 的字段
		value.on = value.on ? value.on : true;

		var route = createRoute(value,key);

		option[key] = route;

	}
	return option;
}


Hspa.prototype.goto = function(path,params){
	this.router.goto(path,params);
}

Hspa.prototype.replace = function(path,params){
	this.router.replace(path,params);
}

var hspa = window.hspa = new Hspa();





}(window))