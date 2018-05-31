(function(exports){


var domUtils = window.domUtils = {
	domList: [],  // 跳转路由后会被移除的dom list
	children:function(elem){
		if(!elem) return;
		var node = elem.firstChild;
		var children = [];
		for(;node;node=node.nextSibling){
			if(node.nodeType === 1){
				children.push(node);
			}
		}
		return children;
	},
	remove: function(el){
		var p = el.parentNode;
		if(p){
			el.parentNode.removeChild( el );
		}
		return el;
	},
	unwrap:function(el, addToDomList){
		var _p = el.parentNode;
		var _children = _p.childNodes;

		var fragment = document.createDocumentFragment();
		
		for(var i=_children.length-1; i>=0; i--) {
			if(addToDomList && _children[i].getAttribute('id') !== 'hspa-router' ){
				this.domList.push( _children[i] );
			}
			fragment.insertBefore(_children[i], fragment.firstChild);
		}
		/*for(var i=0,l=_children.length;i<l;i++){
			var node = _children[i].cloneNode(true);
			fragment.appendChild( node );	
		}*/
		var wrap = _p.parentNode;
		wrap.replaceChild( fragment, _p );

		return wrap;
	},
	stripAndCollapse:function(value){
		//var htmlwhite = ( /[^\x20\t\r\n\f]+/g );
		var htmlwhite = ( /[^\s]+/g );
		var arr = value.match(htmlwhite)||[];
		return arr.join(' ');
	},
	classesToArray:function(value){
		if ( Array.isArray( value ) ) {
			return value;
		}
		if ( typeof value === "string" ) {
			//var htmlwhite = ( /[^\x20\t\r\n\f]+/g );
			var htmlwhite = ( /[^\s]+/g );
			return value.match( htmlwhite ) || [];
		}
		return [];
	},
	addClass:function(el, value){
		var classes = this.classesToArray(value),
		curValue,cur,j,clazz,finalValue;

		if(classes.length>0){
			curValue = el.getAttribute && el.getAttribute('class') || '';
			cur = ' '+this.stripAndCollapse(curValue)+' ';

			if(cur){
				var j=0;
				while( (clazz = classes[j++]) ){
					if ( cur.indexOf( ' ' + clazz + ' ' ) < 0 ) {
						cur += clazz + ' ';
					}
				}

				finalValue = this.stripAndCollapse(cur);
				if(curValue !== finalValue){
					el.setAttribute('class',finalValue);
				}
			}
		}
	},
	removeClass:function(el, value){
		var classes = this.classesToArray(value),
		curValue,cur,j,clazz,finalValue;

		if(classes.length>0){
			curValue = el.getAttribute && el.getAttribute('class') || '';
			cur = ' '+this.stripAndCollapse(curValue)+' ';

			if(cur){
				var j=0;
				while( (clazz = classes[j++]) ){
					if ( cur.indexOf( ' ' + clazz + ' ' ) > -1 ) {
						cur = cur.replace(' '+clazz+' ' ,' ');
					}
				}

				finalValue = this.stripAndCollapse(cur);
				if(curValue !== finalValue){
					el.setAttribute('class',finalValue);
				}
			}
		}
	}
}

//-------------------------载入文本，解析--------------------------------
/* 
	压缩文件内容
	在本地浏览器情况下，不压缩也能正常使用，
	但在 linux 服务器下，若不压缩，使用正则 <style>(.*) 会匹配不到东西，估计是和linux文件的换行符有关
*/
var compress = function (code) {		                
    code = code.replace(/(\n|\t|\s)*/ig, '$1');
    code = code.replace(/\n|\t|\s(\{|\}|\,|\:|\;)/ig, '$1');
    code = code.replace(/(\{|\}|\,|\:|\;)\s/ig, '$1');
    return code;
}
var routerNum = 0; //用于判断是否是第一次请求路由
var routerClass = '';  // 第一次渲染时，<router> 的 className
var textCache = {};
var onceJsCollection = {};
var text = {
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
    load:function(url,callback,tag, parentTag,id,params){
    	hspa.id = '';
    	hspa.query = null;
    	if(id && typeof id === 'string'){
    		hspa.id = id;
    		if(params && typeof params === 'object'){
    			hspa.query = params;
    		}
    	}else if(id && typeof id === 'object'){
    		hspa.query = id;
    	}

    	// 缓存
    	var cacheName = parentTag? parentTag+'-'+tag : tag;
    	if(textCache[cacheName]){
    		console.log('go cache');
    		text.parsecss(tag,textCache[cacheName].css,parentTag);
    		var router = text.parseRouter(tag,textCache[cacheName].html,parentTag);

    		if(textCache[cacheName].jsPath){
    			var srcArr = textCache[cacheName].jsPath;
    			for(var i=0;i<srcArr.length;i++){
					//判断是否是加载一次的脚本（once="true"）
					var jsAttrObj = srcArr[i];
					var tmpArr = (jsAttrObj.src).split('/');
			        var filename = tmpArr[ tmpArr.length-1 ];
			        if( onceJsCollection[filename] ) continue;

           			var _script = document.createElement('script');
			        _script.charset = 'utf-8';
			        _script.async = false;
			        _script.src = jsAttrObj.src;
			        router.appendChild(_script);
           		}
    		}

    		if(typeof callback === 'function'){
                callback(id,params);
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
                    content = compress(content);
                    
                    var htmlRe = /<template>(.*)<\/template>/,
                        cssRe = /<style>(.*)<\/style>/,
                        jsRe = /<script(.*)><\/script>/;

                    var html = content.match(htmlRe)[1],
                        css = content.match(cssRe)[1],
                        jsArr = content.split('<script');
                        jsArr.shift();

                    // css 样式处理
                    text.parsecss(tag,css,parentTag);
                    // html 处理
                    var router = text.parseRouter(tag,html,parentTag);
                    // js 文件处理
                    if(jsArr.length>0){
                    	var _url = url.split('/');
	                    _url.pop();
	                    _url = _url.join('/');

                    	var srcArr = [];
                   		for(var i=0;i<jsArr.length;i++ ){
                   			// 若 .match(/src="(.*)"/); 会出现bug：当为 <script src="xxx" once="true"> 时，r[1] 匹配的结果为 "xxx once="true""
                   			var r = jsArr[i].match(/src="(.*)\.js"/);
                   			var once = jsArr[i].match(/once="true"/) ? true : false; // 当 <script src="xx" once="true"> 表明该js脚本只会加载一次
                   			var jsAttrObj = {
                   				src: _url+'/'+r[1]+'.js',
                   				once: once
                   			}
                   			srcArr.push(jsAttrObj);
                   		}

                   		if(!textCache[cacheName]){
	                    	textCache[cacheName] = {};
	                    }
	                    textCache[cacheName].jsPath = srcArr;
                   		
                   		for(var i=0;i<srcArr.length;i++){
                   			//判断是否是加载一次的脚本（once="true"）
							var jsAttrObj = srcArr[i];
							var tmpArr = (jsAttrObj.src).split('/');
					        var filename = tmpArr[ tmpArr.length-1 ];
					        if( onceJsCollection[filename] ) continue;

                   			var _script = document.createElement('script');
					        _script.charset = 'utf-8';
					        _script.async = false;
					        _script.src = jsAttrObj.src;
					        if(jsAttrObj.once){
					        	onceJsCollection[filename] = true;
					        }
					        if(router) router.appendChild(_script);
                   		}

                    }

                    if(typeof callback === 'function'){
                        callback(id,params);
                    }
                }

            }
        };
        xhr.send(null);
    },
    //对于url: /home/room,  参数path -- 'room', 参数parentPath -- '/home'
    parseRouter:function(path,html,parentPath){
    	parentPath = parentPath || '';

    	// 存缓存
		var cacheName = parentPath? parentPath+'-'+path : path;
		if(!textCache[cacheName]){
	    	textCache[cacheName] = {};
	    }
	    textCache[cacheName].html = html;

	    // 设置 routerId
		var routerId = 'hspa-router'+parentPath;
		// 若是“嵌套写法的非嵌套路径”，那么router始终为 document.getElementById('hspa-router');
    	var completePath = parentPath+'/'+path;
    	//if(unNestedRoutes[completePath]){
    	if( isUnNestedRoute(completePath) ){
    		routerId = 'hspa-router';
    	}

		var router = document.getElementById(routerId);
		if(router){
			
		}else{
			router = document.getElementsByTagName('router')[0];
			if(router){
				
			}else{
				router = document.getElementById('hspa-router');
				routerId = 'hspa-router';
			}
		}

		if(router){
			router.innerHTML = html;
			var _child = domUtils.children(router)[0];

			for(var i=domUtils.domList.length-1;i>=0;i--){
				var node = domUtils.domList[i];
				domUtils.remove(node);
				domUtils.domList.splice(i, 1);
			}

			// 此时 <template> 里的 html 没有一个唯一的父元素包裹着
			if( domUtils.children(router).length > 1 ) {
				
				var tmpRouter = document.createElement('div');
				tmpRouter.setAttribute('id',routerId);
				router.appendChild( tmpRouter );
				domUtils.unwrap(_child, true);
				return tmpRouter;
			}

			_child.setAttribute('id',routerId);

			if(routerNum === 0){
				routerClass = router.className;	
			}
			// bug：子路由的<router>也会加上根路由<router>的class，造成不想要的结果。这里暂时加个判断临时解决。
			if(routerId.indexOf('/') === -1){
				domUtils.addClass(_child, routerClass);
			}
			
			routerNum++;
			domUtils.unwrap(_child);

			return _child;
		}
    },
    parsecss:function(path,css,parentPath){
    	parentPath = parentPath || '';

    	//存缓存
		var cacheName = parentPath? parentPath+'-'+path : path;
		if(!textCache[cacheName]){
	    	textCache[cacheName] = {};
	    }
	    textCache[cacheName].css = css;

	    //设置cssId
		var cssId = 'hspa-current-css'+parentPath;
		// 若是“嵌套写法的非嵌套路径”，那么router始终为 document.getElementById('hspa-router');
    	var completePath = parentPath+'/'+path;
    	//if(unNestedRoutes[completePath]){
    	if(isUnNestedRoute(completePath)){
    		cssId = 'hspa-current-css';
    	}


    	//bug:若是有子路由，那么页面会留下一个style标签，如：<style id="hspa-current-css/other">, 之后切换路由，改标签不会清空。会影响其他页面样式。
		var style = document.getElementById(cssId);
		if(style){

		}else{
			style = document.createElement('style');
			style.setAttribute('type','text/css');
			style.setAttribute('id',cssId);
			document.head.appendChild(style);
		}

	    if(!style) return;
	    style.innerHTML = css;
    }
}


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

/*
	1、嵌套路由：
	{
		'/home':{
			'/room':xxx
		}
	}
	2、嵌套写法的非嵌套路由：
	{
		'/home':xxx,
		'/home/room':xxx
	}
*/
var unNestedRoutes = {}; //存储 嵌套写法的非嵌套路由

/*TODO:id、query的传递，用router为什么失败*/
var Router = window.Router = function(routes){
	this.routes = {}; //路由表
	this.methods  = ['on', 'after', 'before']; //生命周期
	this.config();
	this.mount(routes);
	console.log('routes',this.routes)
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
		//如果是嵌套写法的非嵌套路由，如："/home/detail"，那么 /home/detail 与 /home 是独立的
		if(path.split('/').length>2){
			// 对路径如 "/home/detail/:id" 的处理
			if( /\:/.test(path) ){
				path = path.split(':')[0]+'([._a-zA-Z0-9-%()]+)';
			}
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

		//是 "url":"url" 的情况时
		if(path === 'url'){
			that.insert( parentPath, 'url', route );
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


/*
	判断是否是 嵌套写法的非嵌套路由
	这种写法是考虑到 :id 的情况，

	如配置路由 "/home/:id",
	路由表中格式转换为 "/home/([._a-zA-Z0-9-%()]+)"
	应用中 "/home/1234" 能匹配到
*/

function isUnNestedRoute(value){
	if(!value) return false;
	for(var path in unNestedRoutes){

		var _value = value.split('/').filter(Boolean),
			_path = path.split('/').filter(Boolean);


		if(_value.length === _path.length){
			var num = 0;
			for(var i=0,j=0;i<_value.length;i++,j++){
				var match = _value[i].match( new RegExp(_path[j]) )
				if(match){
					num++;
				}
			}
			if(num === _value.length){
				return true;
			}
		}else{
			continue;
		}

	}
	return false;
}


//根据 hash 执行对应的回调事件
//path 为 "/home" 或 "/home/detail"
var toOther=0,toNested=1,toParent=2,toReload=3;
Router.prototype.dispatch = function(path,callback){
	var that = this;
	var runList = this.createRunList(path,this.routes,null,callback);

	//如果是 嵌套写法的非嵌套路由，如 /home/room 与 /home 之间的跳转规则为 toOther
	//if( unNestedRoutes[path] || unNestedRoutes[this.lastPath] ){
	if( isUnNestedRoute(path) || isUnNestedRoute(this.lastPath) ){
		this.invoke(this.last);
		this.invoke(runList);
		this.last = [ runList.after ];
		this.lastPath = path;
		return;
	}

	function typeOfRoute(path,lastPath,parentPath){
		if( lastPath === undefined && parentPath ){ //嵌套路由执行刷新
			return toReload;
		}
		else if( lastPath && lastPath === parentPath){
			return toNested;
		}
		else if( lastPath && lastPath.match( new RegExp(path) ) ){
			return toParent;
		}
		else{
			/*
				考虑浏览器后退的情况

				如从 /home/room 跳转到 /user,
				浏览器再后退回到 /home/room
				此时 routerType 为 "to other"，
				页面渲染不会执行 /home ，而是直接执行 /home/room。这样会造成我们不想要的结果
			*/
			if(lastPath){
				var _lastPath = lastPath.split('/').filter(Boolean)[0],
					_path = path.split('/').filter(Boolean)[0];

				// 说明是同一个根路由内的跳转
				if(_lastPath === _path){

				}
				//说明是其他路由跳转到当前。且当前路径是嵌套路由写法
				else if( path.split('/').length > 2 ){
					return toReload;
				}
			}
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
	}else if(type === toReload){
		this.invoke(this.last); //调用上次路由的after	
		this.dispatch(runList.parentPath,function(){
			that.invoke(runList);
		});
		this.last = [ runList.after ];
	}
	this.lastPath = path;

}

//创建执行队列,如：[before,on]
// path 为数组，如 ["home"] 、['home','detail']
Router.prototype.createRunList = function(path,routes,parentReg,callback){

	// 构建查询参数，如 "?name=xx&id=xxx" 构建为 Object
	var _arr = path.split('?');
	var queryBody = _arr[1];
	var query;
	if( queryBody ){
		query = {};
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

				var render = function(id,params){
					var c = function(){
						if(typeof callback === 'function') callback();
						if(typeof routes[r].on === 'function') routes[r].on();
					}
					text.load( routes[r].url, c, r, parentReg,id,params );
				}

				runList = [ routes[r].before, render ].filter(Boolean);
				runList.after = routes[r].after;

				var oldAfter = runList.after;
				runList.after = function(){
					// 说明是从一个子路由离开
					//bug:若是有子路由，那么页面会留下一个style标签，如：<style id="hspa-current-css/other">, 之后切换路由，改标签不会清空。会影响其他页面样式。
					var pathArr = path.split('/');
					if( pathArr.length > 2 ) {
						pathArr.pop();
						var id = 'hspa-current-css' + pathArr.join('/');
						var style = document.getElementById(id);
						if(style){
							style.innerHTML = '';
						}
					}
					if(typeof oldAfter === 'function'){
						oldAfter();
					}
				}

				runList.capture = match.slice(1);
				runList.capture.push(query);
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


//--------------------------- hspa constructor-------------------------------------

function Hspa(){
	this.id = '';
	this.query = null;
}

Hspa.prototype.init = function(routes,r){
	var router = this.router = new Router(routes);
	router.init(r);
}

Hspa.prototype.goto = function(path,params){
	this.router.goto(path,params);
}

Hspa.prototype.replace = function(path,params){
	this.router.replace(path,params);
}

var hspa = window.hspa = new Hspa();




}(window))