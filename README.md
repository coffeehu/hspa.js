# hspa.js
轻量简单的 SPA 路由框架  

### [在线演示](http://www.hcbook.cc/demo/hspa.js/demo/spa/index.html)

# 使用
### 1、引入
```
<head>
    <script src="./hspa.js"></script>
</head>
```

```
<body>
    <ul>
    	<li><a href="#/home">home</a></li>
    	<li><a href="#/user">user</a></li>
    </ul>
    
    <router></router>
</body>
```
页面都渲染在标签 <router></router> 中。 

### 2、初始化
```
var routes = {
    '/home':{
        url : ’./views/home.html’ //将要渲染的模板文件
    },
    '/user':{
        url : ’./views/user.html’
    }
};

//第二个参数表示默认路由为’/home’:
hspa.init(routes,'/home'); 
```

# 模板文件结构
```
'/home':{
    url : ’./views/home.html’ //将要渲染的模板文件
}
```
这里的 html 文件称为模板文件，有其特殊的结构，如：

```
//home.html 的结构
<template>
    <div class="home">
    	......
    </div>
</template>

<style>
    .home{
        width: 100%;
        background: #eee;
    }
</style>

<script src="./home.js"></script>
```

### 1、<template>
html 内容。  
如上，<router></router> 将被渲染为 <div class=”home”>....</div>

**注意！建议 html 结构要有一个唯一的父元素包裹！**

如果有特殊需求的情况（如需要复用一个可交互的地图作为页面底图），也支持如下写法：
```
<template>
    <h1></h1>
    <div></div>
    <div></div>
</template>
```
### [在线例子](http://www.hcbook.cc/demo/hspa.js/demo/spa-map/index.html)

### 2、<style>
css 样式内容。

### 3、<script> 
只支持引入 js 文件，可以引入多个，执行顺序从上向下。


# 路由的跳转
1、<a>标签
<a href=”#/home”>home</a>

2、js代码跳转
hspa.goto(‘/home’);

3、若不想浏览器生成前进后退的历史，可使用：
hspa.replace(‘/home’);

# 钩子函数
- before: 跳转之前
- on:跳转到该页面且页面渲染后
- after:离开该路由时

示例：
```
'/user':{
	url:'./views/user/user.html',
	before:function(){
		console.log('before user');
	},
	on:function(){
		console.log('on user');
	},
	after:function(){
		console.log('after user');
	}
}
```

# 嵌套路由
### 1、html 代码：home.html

```
<template>
    <div class="home">
        <ul>
            <li><a href="#/home/room">room</a></li>
        </ul>
        <router></router>
    </div>
</template>
```


### 2、js 配置 options

```
'/home':{
    url:'./views/home/home.html',
    '/room':{
    	url:'./views/home/room.html'
    }
}
```

如上， home.html 内部也有一个 <router></router>;  

当匹配到 ‘/home/room’ 时，该 <router> 标签会根据 room.html 渲染。

### 嵌套写法的非嵌套路由

```
'/home':{
	url:'./views/home/home.html',
},
'/home/room':{
	url:'./views/home/room.html'
}
```
如上写法的 /home 和 /home/room 之间实际没有包含关系，它们就像其他普通路由一样；


# 路由的传参
### 1、匹配路由
```
'/user/:id':{
	on:function(id){				
        console.log(id);
    }
},
```


当路径为 /user/xxx 时就能匹配到。（xxx 为任意数字、字母、下划线组成的 string 字符串.）  

如：
> <a href="#/user/123"></a>  //获得的 id 值为 “123”


**在模块文件的 js 页面中，
可通过调用 hspa.id 来获得当前页面的 id 值。**

### 2、查询参数

```
var params = {
    name:’hc’,
    id:’123’
};
hspa.goto(‘/home’,params);
```

跳转后路径会附带查询字符串： ?name=hc&id=123


```
'/home':{
    on:function(params){				
        console.log(params); //可直接获得参数对象
    }
},
```

**在模块文件的 js 页面中，可通过调用 hspa.query 来获得当前页面的 查询参数 值。**