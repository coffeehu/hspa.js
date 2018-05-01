(function(){

alert(123)
var home = document.getElementsByClassName('home')[0];
if(home){
	home.onclick = function(){
		alert('home');
	}	
}

})();

