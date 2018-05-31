(function(){
    //-------requestAnimationFrame---------
	var lastTime = 0;
	var vendors = ['ms','moz','webkit','o'];
	for(var x=0;x<vendors.length&&!window.requestAnimationFrame;x++){
		window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
		window.cancelAnimationFrame = window[ vendors[x]+'CancelAnimationFrame' ] || window[ vendors[x]+'CancelRequestAnimationFrame' ];
	}
	if(!window.requestAnimationFrame){
		window.requestAnimationFrame = function(callback,el){
			var currTime = new Date().getTime();
			var timeToCall = Math.max(0, 16-(currTime-lastTime) );
			var id = window.setTimeout(function(){
				callback(currTime+timeToCall);
			},timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		}
	}
	if(!window.cancelAnimationFrame){
		window.cancelAnimationFrame = function(id){
			clearTimeout(id);
		}
	}

    //-------element.classList---------
	if(!document.body.classList){
	    Object.defineProperty(HTMLElement.prototype,'classList',{
	    	get:function(){
	    		var that = this;
	    		var utils = {
	    			stripAndCollapse:function(value){
	    				//var htmlwhite = ( /[^\x20\t\r\n\f]+/g );
	    				var htmlwhite = ( /[^\s]+/g );
	    				var arr = value.match(htmlwhite)||[];
	    				return arr.join(' ');
	    			},
	    			addClass:function(el, value){
	    				var curValue,cur,j,clazz=value.trim(),finalValue;
	    
	    				curValue = el.getAttribute && el.getAttribute('class') || '';
	    				cur = ' '+this.stripAndCollapse(curValue)+' ';
	    
	    				if(cur){
	    					var j=0;
	    					if ( cur.indexOf( ' ' + clazz + ' ' ) < 0 ) {
	    						cur += clazz + ' ';
	    					}
	    
	    					finalValue = this.stripAndCollapse(cur);
	    					if(curValue !== finalValue){
	    						el.setAttribute('class',finalValue);
	    					}
	    				}
	    			},
	    			removeClass:function(el, value){
	    				var curValue,cur,j,clazz=value.trim(),finalValue;
	    
	    				curValue = el.getAttribute && el.getAttribute('class') || '';
	    				cur = ' '+this.stripAndCollapse(curValue)+' ';
	    
	    				if(cur){
	    					var j=0;
	    					if ( cur.indexOf( ' ' + clazz + ' ' ) > -1 ) {
	    						cur = cur.replace(' '+clazz+' ' ,' ');
	    					}
	    
	    					finalValue = this.stripAndCollapse(cur);
	    					if(curValue !== finalValue){
	    						el.setAttribute('class',finalValue);
	    					}
	    				}
	    			},
	    			hasClass:function(el,value){
	    				var className = ' '+value+' ';
	    				var curValue = el.getAttribute && el.getAttribute('class') || '';
	    				var cur = ' '+this.stripAndCollapse(curValue)+' ';
	    
	    				if(cur.indexOf(className) > -1){
	    					return true;
	    				}
	    				return false;
	    			}
	    		};
	    
	    		return {
	    			add:function(value){
	    				utils.addClass(that,value);
	    			},
	    			remove:function(value){
	    				utils.removeClass(that,value);
	    			},
	    			contains:function(value){
	    				return utils.hasClass(that,value);
	    			},
	    			toggle:function(value){
	    				if( utils.hasClass(that,value) ){
	    					utils.removeClass(that,value);
	    					return false;
	    				}else{
	    					utils.addClass(that,value);
	    					return true;
	    				}
	    			}
	    		};
	    	}
	    })
	}
}());