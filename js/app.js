var map;
var userLoaction = {lat:25.077, lng:121.232};
var markerClusterer = null;
var usrPos;
var geocoder = new google.maps.Geocoder();
var usrsMk = [];
var isUsrOnline;
var zoomLevel;
const dbRef = firebase.database().ref();
var SN = 0;
var currentSN = 0;
var ST = [];
var storeType = [
				{val : 'none', text: '請選擇店家類型'},
				{val : 'food', text: '美食'},
				{val : 'cafe', text: '咖啡'},
				{val : 'drink', text: '飲品'},
				{val : 'commodity', text: '零售'},
				{val : 'rest', text: '旅宿'},
				{val : 'activity', text: '活動'},
];
var storeServices = [
				{val : 'wifi', text: 'Wi-Fi'},
				{val : 'charging', text: '充電'},
				{val : 'creditCard', text: '信用卡'},
				{val : 'parking', text: '停車'},
				{val : 'pet', text: '寵物入內'},
				{val : 'NOFoDA', text: '禁帶外食'},
				{val : 'reservation', text: '預約制'},
				{val : 'smoking', text: '可吸菸'},
				{val : 'miniCharge', text: '最低消費'},
				{val : 'vegetarian', text: '素食'},
				{val : 'breakfast', text: '早餐'},
];

		
var uiConfig = {
  'callbacks': {
    // Called when the user has been successfully signed in.
    'signInSuccess': function(user, credential, redirectUrl) {
      handleSignedInUser(user);	
      // Do not redirect.
      return false;
    }
  },
  // Opens IDP Providers sign-in flow in a popup.
  'signInFlow': 'popup',
  'signInOptions': [
    // TODO(developer): Remove the providers you don't need for your app.
    {
      provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      scopes: ['https://www.googleapis.com/auth/plus.login']
    },
    {
      provider: firebase.auth.FacebookAuthProvider.PROVIDER_ID,
      scopes :[
        'public_profile',
        'email',
        'user_likes',
        'user_friends'
      ]
    },
    firebase.auth.TwitterAuthProvider.PROVIDER_ID,
    firebase.auth.GithubAuthProvider.PROVIDER_ID,
    firebase.auth.EmailAuthProvider.PROVIDER_ID
  ],
  // Terms of service url.
  'tosUrl': 'https://www.google.com'
};

// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());
// Keep track of the currently signed in user.
var currentUid = null;
var currentPhotoURL = null;

function addYourLocationButton(map) {
	var controlDiv = document.createElement('div');
	
	var firstChild = document.createElement('button');
	firstChild.style.backgroundColor = '#fff';
	firstChild.style.border = 'none';
	firstChild.style.outline = 'none';
	firstChild.style.width = '28px';
	firstChild.style.height = '28px';
	firstChild.style.borderRadius = '2px';
	firstChild.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
	firstChild.style.cursor = 'pointer';
	firstChild.style.marginRight = '10px';
	firstChild.style.padding = '0px';
	firstChild.title = 'Your Location';
	controlDiv.appendChild(firstChild);
	
	var secondChild = document.createElement('div');
	secondChild.style.margin = '5px';
	secondChild.style.width = '18px';
	secondChild.style.height = '18px';
	secondChild.style.backgroundImage = 'url(https://maps.gstatic.com/tactile/mylocation/mylocation-sprite-1x.png)';
	secondChild.style.backgroundSize = '180px 18px';
	secondChild.style.backgroundPosition = '0px 0px';
	secondChild.style.backgroundRepeat = 'no-repeat';
	secondChild.id = 'you_location_img';
	firstChild.appendChild(secondChild);
	
	google.maps.event.addListener(map, 'dragend', function() {
		$('#you_location_img').css('background-position', '0px 0px');
	});

	firstChild.addEventListener('click', function() {
		var imgX = '0';
		var animationInterval = setInterval(function(){
			if(imgX == '-18') imgX = '0';
			else imgX = '-18';
			$('#you_location_img').css('background-position', imgX+'px 0px');
		}, 500);
		if(navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function(position) {
				var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
				map.setCenter(latlng);
				clearInterval(animationInterval);
				$('#you_location_img').css('background-position', '-144px 0px');
			});
		}
		else{
			clearInterval(animationInterval);
			$('#you_location_img').css('background-position', '0px 0px');
		}
	});
	
	controlDiv.index = 1;
	map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);
}

function init() {
	for(var i = 1; i<storeType.length; i++){
		usrsMk[storeType[i].val] = [];
	}
	document.getElementById('sign-out').addEventListener('click', function() {
		writeUserState(currentUid, false);
		if(SN>0){
			for(SN; SN>0; SN--){
				ST[SN].remove();
			}
			ST = [];
		}
		cleanUserStoreInterface();
		firebase.auth().signOut();
	});
  document.getElementById('delete-account').addEventListener('click', function() { 
		deleteAccount();
  });
	
	$('#user').click(function(){
		$("#user-main").toggle();
	});

  addUserControlPanel();
  addUserStoreInterface();
  showStores();
  
	map = new google.maps.Map(document.getElementById('map'), {
		zoom: 15,
		center: userLoaction,
		zoomControl: true,
		mapTypeControl: false,
		scaleControl: true,
		streetViewControl: false,
		rotateControl: true,
		styles: [
			{
					featureType: 'poi.business',
					stylers: [{"visibility": "off"}]
      }
		]
	});
	
	markerClusterer = new MarkerClusterer(map, usrsMk, {imagePath: '../images/m'});
	
	// Try HTML5 geolocation.
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {

				var pos = {
					lat: position.coords.latitude,
					lng: position.coords.longitude
				};


				map.setCenter(pos);
				map.setZoom(18);
				var Circle = new google.maps.Circle({
					strokeColor: '#4A8EE4',
					strokeOpacity: 0.8,
					strokeWeight: 2,
					fillColor: '#4A8EE4',
					fillOpacity: 0.25,
					map: map,
					center: pos,
					radius: 20
				});
				var innerCircle = new google.maps.Circle({
					strokeColor: '#FFFFFF',
					strokeOpacity: 1,
					strokeWeight: 3,
					fillColor: '#4A8EE4',
					fillOpacity: 1,
					map: map,
					center: pos,
					radius: 3
				});
				if(currentUid != null){
					writeUserLocation(currentUid, pos);
				}
		});
	} 
	addYourLocationButton(map);

	map.addListener('zoom_changed', function() {
			zoomLevel = map.getZoom();
			showStores();
	});

	$(function(){
	
			$('#about').click(function(){
				$("#about-main").toggle();
			});
	
			$('#about-main').append("<div>不同類型的店家有相對應的顏色<br />黑色為店家不在線上(可能休息中)<br />白色為店家在線上(可能營業中)<br /><br />右邊藍色的商店圖案點開<br />輸入好資料後按update便可以設置好店家<br /><br />此為beta版本 往後會不斷更新<br />有任何問題請<a href='https://www.facebook.com/CK2501'>聯絡我</a></div>");
			

			var x = $("#right_slider_scroll").width();
			$("#right_fb_tab").click(function() {
				

				if ($("#right_slider_scroll").css('right') == '-'+x+'px')
				{
					$("#right_slider_scroll").animate({right:'0px'});
				}else{
					$("#right_slider_scroll").animate( { right:'-'+x+'px' });	
				}
			});

			// 預設顯示第一個 Tab
			var _showTab = 0;
			var $defaultLi = $('ul.tabs li').eq(_showTab).addClass('active');
			$($defaultLi.find('a').attr('href')).siblings().hide();
	
			$('ul.tabs').delegate("li","click",function() {
					// 找出 li 中的超連結 href(#id)
					var $this = $(this),
							_clickTab = $this.find('a').attr('href');
					// 把目前點擊到的 li 頁籤加上 .active
					// 並把兄弟元素中有 .active 的都移除 class
					$this.addClass('active').siblings('.active').removeClass('active');

					cleanUserStoreInterface();
					currentSN = _clickTab.substring(4);
					readUserStoreData(currentUid, currentSN);
	
					return false;
			}).find('a').focus(function(){
					this.blur();
			});
		});
}

function showUserLoction(){
		navigator.geolocation.getCurrentPosition(function(position) {
				usrPos = {
					lat: position.coords.latitude,
					lng: position.coords.longitude
				};
				map.setCenter(usrPos);
				map.setZoom(18);
				
				latlngToAddress(usrPos);

				if(currentUid != null){
					writeUserLocation(currentUid, usrPos);
				}
		});
};

function latlngToAddress(pos) {
		geocoder.geocode({'latLng': pos }, function(results, status) {
				if (status === google.maps.GeocoderStatus.OK) {
					// 如果有資料就會回傳
					if (results) {
						$('input[name="usr_addr"]').val(results[0].formatted_address);
					}
				}
				// 經緯度資訊錯誤
				else {
					alert("Reverse Geocoding failed because: " + status);
				}
		});
}


function initAutocomplete() {

  // Create the search box and link it to the UI element.
  var input = document.getElementById('pac-input');
  var searchBox = new google.maps.places.SearchBox(input);
  // map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

	

  // Bias the SearchBox results towards current map's viewport.
  map.addListener('bounds_changed', function() {
    searchBox.setBounds(map.getBounds());
  });

  var markers = [];
  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener('places_changed', function() {
    var places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    // Clear out the old markers.
    markers.forEach(function(marker) {
      marker.setMap(null);
    });
    markers = [];

    // For each place, get the icon, name and location.
    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(place) {
	  
      var icon = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25)
      };

      // Create a marker for each place.
      markers.push(new google.maps.Marker({
		  map: map,
		  icon: icon,
		  title: place.name,
		  position: place.geometry.location
	  }));
	  

      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);	
      }
	  
	  
    });
    map.fitBounds(bounds);
	
	
  });
}

google.maps.event.addDomListener(window, 'load', function() {
  init();
  initAutocomplete()
});

/**
 * Displays the UI for a signed in user.
 * @param {!firebase.User} user
 */
var handleSignedInUser = function(user) {
  currentUid = user.uid;
	currentPhotoURL = user.photoURL;	
  document.getElementById('user-signed-in').style.display = 'block';
  document.getElementById('user-signed-out').style.display = 'none';
	document.getElementById('right_slider_scroll').style.display = 'block';
  $('#user').removeClass("fa fa-user-circle").css("background-image","url("+ user.photoURL +")");
	document.getElementById('name').textContent = user.displayName;
  document.getElementById('email').textContent = user.email;
  if (user.photoURL){
    document.getElementById('photo').src = user.photoURL;
    document.getElementById('photo').style.display = 'block';
  } else {
    document.getElementById('photo').style.display = 'none';
  }
	
	writeUserData(user.uid, user.displayName, user.photoURL);
	writeUserState(user.uid, true);	
	readUserStoreNumber(currentUid);
	readUserStoreData(user.uid, 0);
	
	
};


/**
 * Displays the UI for a signed out user.
 */
var handleSignedOutUser = function() {
  document.getElementById('user-signed-in').style.display = 'none';
  document.getElementById('user-signed-out').style.display = 'block';
	document.getElementById('right_slider_scroll').style.display = 'none';
	$('#user').css('background-image', 'none').addClass("fa fa-user-circle");
  ui.start('#firebaseui-container', uiConfig);
};

// Listen to change in auth state so it displays the correct UI for when
// the user is signed in or not.
firebase.auth().onAuthStateChanged(function(user) {

  // The observer is also triggered when the user's token has expired and is
  // automatically refreshed. In that case, the user hasn't changed so we should
  // not update the UI.
  /*if (user && user.uid == currentUid) {
    return;
  }*/
  user ? handleSignedInUser(user) : handleSignedOutUser();
});

/**
 * Deletes the user's account.
 */
var deleteAccount = function() {
  firebase.auth().currentUser.delete().catch(function(error) {
    if (error.code == 'auth/requires-recent-login') {
      // The user's credential is too old. She needs to sign in again.
      firebase.auth().signOut().then(function() {
        // The timeout allows the message to be displayed after the UI has
        // changed to the signed out state.
        setTimeout(function() {
          alert('Please sign in again to delete your account.');
        }, 1);
      });
    }
  });
};

function writeUserData(UID, name, photo) {
	  dbRef.child(UID).update({
			username: name,
			photoURL: photo
	  });	
};

function writeUserLocation(UID, pos){
		dbRef.child(UID).update({
			pos: pos,
		});
};

function writeUserState(UID, bool) {
		var online = bool ? true : false;
		dbRef.child(UID).update({
			online: bool
		});
};

function writeUserStoreNumber(UID, SN) {
		dbRef.child(UID).update({
			storeNumber: SN,
		});
};

function writeUserStoreData(UID, SN, photoURL, type, name, pos, tel, homepage, body, service, recommend) {
		var number = UID +'-'+ SN;
		var t = new Date();
		var time = [];
		time[0] = t.getTime();
    t = t.getMonth()+1+"/"+t.getDate()+"/"+t.getFullYear()+" "+t.getHours()+":"+t.getMinutes()+":"+t.getSeconds();
		time[1] = t;
		dbRef.child(UID+'/store/'+ SN).update({
			number: number,
			photoURL: photoURL,
			type: type,
			name: name,
			pos: pos,
			tel: tel,
			homepage: homepage,
			body: body,
			service: service,
			recommend: recommend,
			latestUpdate: time
		});
		console.info("write successful");
};

function readUserStoreData(UID, SN) {
	  firebase.database().ref(UID+'/store/'+SN).once("value", snap => {
				if(snap.val() != null){
					  $('#myStoreSelect').val(snap.val().type);
						$('input[name="usr_name"]').val(snap.val().name);
						usrPos = snap.val().pos;
						latlngToAddress(usrPos);
						$('input[name="usr_tel"]').val(snap.val().tel);
						$('input[name="usr_homepage"]').val(snap.val().homepage);
						var service = snap.val().service.split(",");
						for(var i = 0; i < service.length; i++){
							$('input[name="service[]"][value="'+service[i] +'"]').prop('checked',true); 
						}
				}
		});
}

function readUserStoreNumber(UID){
		dbRef.child(UID).once("value", snap => {
				SN = snap.val().storeNumber;
				for(var i=1; i<=SN; i++){
					if(!ST[i]){
						ST[i] = $('<li><a href="#tab' + i +'">Store' + i + '</a></li>'); 
						$('.tabs').append(ST[i]);
					}
				};
		});
}

function showStores() {
		dbRef.on("value", snap => {
				snap.forEach(function(childSnap){
						childSnap.child("store").forEach(function(grandSnap){
							 setMarker(grandSnap.val(), childSnap.val().online);
						});
				});
		});
}

function removeMarker(markerId) { 
		for(var i in usrsMk){
				usrsMk[i].forEach(function(marker){
						if(marker.metadata.id == markerId){
								marker.setMap(null);
								delete marker;
						}
				});
		}
}

function setMarker(store, state) {
		removeMarker(store.number);
    var pos = new google.maps.LatLng(store.pos.lat-0.00002,store.pos.lng);
		var photoURL = store.photoURL ? store.photoURL : 'images/photo.png';
		var photo = '<img src="'+photoURL+'"/>';
		var icon = state ? '<div class="storeIcon-on" id="'+store.type+'">'+photo+'</div>':'<div class="storeIcon-off" id="'+store.type+'">'+photo+'</div>';
		var content, tmpHomepage, tmpRecommend;
		if(zoomLevel>=21){
			  tmpHomepage = store.homepage;
				if(tmpHomepage.substring(0,4) != "http"){
						tmpHomepage = "http://"+tmpHomepage;
				}
			  var name = '<div>'+store.name+'</div>';
				var tel = '<div>'+store.tel+'</div>';
				var homepage = '<a href="'+tmpHomepage+'">homepage</a>';
				var service = "";
				var arr = store.service.split(',');
				arr.forEach(function(i){
						storeServices.forEach(function(y){
								if(i == y.val){
									  service += y.text+", ";
								}
						});
				});
				service = service.substring(0, service.length-2);
				service = '<div>'+service+'</div>';
				var left = '<div id="content_left">'+name+photo+tel+homepage+service+'</div>';
				var right = '<div id="content_right">';
				if(store.body){
				  	var	body = '<div>'+store.body+'</div>';
						right += body;
				} 
				if(store.recommend) {
						tmpRecommend = store.recommend;
						if(tmpRecommend.substring(0,4) != "http"){
								tmpRecommend = "http://"+tmpRecommend;
						}
						var recommend = '<div><a href="'+tmpHomepage+'"><img id="recommendImg" src="'+tmpRecommend+'"/></a></div>';
						right += recommend;
				}				
				right += '</div>';
				if(store.body === "" && store.recommend === ""){
					content = '<div class="store"><div class="arrow_box">'+left+'</div>'+icon+'</div>';
				}else{
					content = '<div class="store"><div class="arrow_box">'+left+right+'</div>'+icon+'</div>';
				}
		}else if(zoomLevel>17 && zoomLevel<21){
			  content = '<div class="store"><div class="arrow_box">'+store.body+'</div>'+icon+'</div>';
		}else{
				content = icon;
		}
		var temp_marker = new RichMarker({
          position: pos,
          map: map,
          draggable: false,
					flat: true,
					shape:{coords:[17,17,18],type:'circle'},
          content: content
				});
		temp_marker.metadata = {id: store.number, online: state};
		google.maps.event.addListener(temp_marker, 'click', function() {		
			showStoresInfo(store.number);
    });
		usrsMk[store.type].push(temp_marker);
}
function showStoresInfo(number){
	
	var root = number.split('-');
	dbRef.child('store').child(root[1]).orderByChild('number').equalTo(number).once("value", snap => {
			snap.forEach(function(childSnap){
				console.log(childSnap.key);
				
			});
	});
}

function toggleGroup(type) {
		usrsMk[type].forEach(function(marker){
				if(marker){
					marker.setVisible(!marker.getVisible());
					console.log(marker.metadata.online);
				}
		});
}

function toggleOnAndOff(state) {
		for(var i in usrsMk){
					usrsMk[i].forEach(function(marker){
							if(marker.metadata.online == state){
									marker.setVisible(!marker.getVisible());
							}
					});
			}
}

function addUserControlPanel() {
		
	  var sType = [];
		for(var i = 1; i<storeType.length; i++){
				sType[i-1] = '<p class="usrCheckbox" id="u'+storeType[i].val+'"><input type="checkbox" onClick=toggleGroup("'+storeType[i].val+'") name="sType[]" value="'+storeType[i].val+'">'+storeType[i].text+'</p>';
		}
		
	  sType[sType.length] = '<p class="usrCheckbox"><input type="checkbox" onClick=toggleOnAndOff(true) name="sType[]" value="online">在線上</p>';
		sType[sType.length] = '<p class="usrCheckbox"><input type="checkbox" onClick=toggleOnAndOff(false) name="sType[]" value="offline">不再線上</p>';
		var usrCheckboxzone = '<div class="usrCheckboxzone">';

		$(sType).each(function(){
				usrCheckboxzone += this;
		});
	  usrCheckboxzone += '</div>';
		$('#user-control-panel').append(usrCheckboxzone);
		$('input[name="sType[]"]').prop("checked",true);
}

function addUserStoreInterface(){

		var select = '<select id="myStoreSelect"></select>';

		var btnLocation = '<button id="btnLocation">+</button>';
		var service = [];
		for(var i = 0; i<storeServices.length; i++){
			service[i] = '<input type="checkbox" name="service[]" value="'+storeServices[i].val+'">'+storeServices[i].text+'';
		}
		
		var name =     '<td><p class="fa fa-user"></p></td><td><input type="text" name="usr_name" placeholder="店家名稱"></td><td></td>';
		var address =  '<td><p class="fa fa-map-marker"></p></td><td><input type="text" name="usr_addr"></td><td>'+btnLocation+'</td>' ;
		var tel =      '<td><p class="fa fa-phone"></p></td><td><input type="tel" name="usr_tel" placeholder="聯絡電話"></td><td></td>';
		var homepage = '<td><p class="fa fa-globe"></p></td><td><input type="url" name="usr_homepage" placeholder="網頁網址"></td><td></td>';
		var body =     '<td><p class="fa fa-commenting-o"></p></td><td><textarea name="usr_body" rows="4" placeholder="想分享..."></textarea></td>';
    var recommend = '<td><p class="fa fa-certificate"></p></td><td><input type="url" name="usr_recommend" placeholder="活動圖片網址"></td><td></td>';

		var btnUpdate = '<button id="btnUpdate">Update</button>';

		$('#content_left').append(select+'<table width="100%"><tr>'+name+'</tr><tr>'+address+'</tr><tr>'+tel+'</tr><tr>'+homepage+'</tr></table><p>提供:</p>');
		
		$(service).each(function(){
			$('#content_left').append(this);
		});
		
		$('#content_right').append('<table width="100%"><tr>'+body+'</tr><tr>'+recommend+'</tr></table>'+ btnUpdate);

		$(storeType).each(function() {
				$('select').append($("<option></option>").attr('value',this.val).text(this.text));
			});

		
	  $('input[name="usr_addr"]').geocomplete({
          map: map,
    }).bind("geocode:result", function(event, result){
			usrPos = {
				lat: result.geometry.location.lat(),
				lng: result.geometry.location.lng()
			};
			console.log(usrPos);
		});


		$('#btnUpdate').click(function(){
			if($('select').val() == "none"){
				alert("請選擇店家類型");
			}else{
				var checkedValue = $('input[name="service[]"]:checked').map(function(){ 
 	    		return $(this).val();
				}).get().join(',');
				var usrBody = $('textarea[name="usr_body"]').val();
        usrBody = usrBody.replace(/\n/g,"<br />");
				writeUserStoreData(currentUid, currentSN, currentPhotoURL, $('select').val(), $('input[name="usr_name"]').val(), usrPos, $('input[name="usr_tel"]').val(), $('input[name="usr_homepage"]').val(), usrBody,checkedValue,$('input[name="usr_recommend"]').val());
			}
		});

		$('#btnLocation').click(function(){
			if (navigator.geolocation) {
					showUserLoction();
			}
		});

		$('.abgne_tab').append('<button id="addStore">新增店面</button>');
		$('#addStore').click(function(){
			alert("此功能尚未開放");
			/*
			SN++;
			$('.tabs').append('<li><a href="#tab' + SN +'">Store' + SN + '</a></li>');
			writeUserStoreNumber(currentUid, SN);
			*/
		});
}

function cleanUserStoreInterface() {
		$('select').val('none');
		$('input[name="usr_name"]').val("");
		$('input[name="usr_addr"]').val("");
		$('input[name="usr_tel"]').val("");
		$('input[name="usr_homepage"]').val("");
		$('textarea[name="usr_body"]').val("");
		$('input[name="usr_recommend"]').val("");
		$('input[name="service[]"]').prop("checked",false);
}
