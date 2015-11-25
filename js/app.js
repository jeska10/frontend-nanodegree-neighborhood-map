function MyViewModel() {
    var self = this;

    var myMap;
    var lat = 30.3201;
    var lng = -86.1377;
    var latLng;
    var infoWindow;
    var service;

    self.places = ko.observableArray([]);
    self.currentPlace = ko.observable();
    self.searchString = ko.observable();

    // highlight the place clicked in the list of places and
    // display the info window
    self.placeClick = function (clickedPlace) {
        var listItem;
        var clickedItem;

        if (self.currentPlace() != null && self.currentPlace().id != clickedPlace.id) {
            //end the current animation
        	self.currentPlace().marker.setAnimation(null);
			infowindow.close(myMap, self.currentPlace().marker);
            listItem = $('#' + self.currentPlace().id);
            listItem.removeClass("current-place");
        }
        
        self.currentPlace(clickedPlace);
        clickedItem = $('#' + clickedPlace.id);
        clickedItem.addClass("current-place");
        self.displayInfoWindow(self.currentPlace());
        self.currentPlace().marker.setAnimation(google.maps.Animation.BOUNCE);
    };

    // match the search string with the name and/or type of the list of places
    self.searchPlaces = function (text) {
        var str = self.searchString().toLowerCase();

        ko.utils.arrayForEach(self.places(), function(place) {
            var name = place.name.toLowerCase();
            var types = place.types;
            
            if (name.indexOf(str) >= 0 || types.indexOf(str) >= 0 || str == '') {
                place.matchedPlace(true);
                place.marker.setMap(myMap);
            } else {
                place.matchedPlace(false);
                place.marker.setMap(null);
            }
        });
    };

    // display the info window for the current place
    self.displayInfoWindow = function (place) {
        var request = {
            placeId: place.place_id
        };

        // get the details for the passed in place
    	service.getDetails(request, function (details, status) {
            // Default values to display if getDetails fails.
            var locName = '';
            var locStreet = '';
            var locCityState = '';
            var locPhone = '';
            var locOpenHours = '';
            var businessUrl = '';
            var businessRatingImg = '';
            var businessImage = '';

            // if the call to get details is successful then display the available information
            // if the call fails just display the name of the place
            if (status == google.maps.places.PlacesServiceStatus.OK) {
                if (details.website) {
                    // Link to the web page of the of the passed in place
                    locName = '<span class="business-link"><a target="_blank" href=' + details.website +
                        '>' + place.name + '</a></span>';
                }
                else {
	                locName = '<span class="business-link"><h4>' + place.name + '</h4></span>';
                }
                if (details.formatted_phone_number) {
                    locPhone = '<p>' + details.formatted_phone_number + '</p>';
                }
                if (details.formatted_address) {
                    locStreet = '<p>' + details.formatted_address + '</p>';
                }
            }
            else {
				locName = '<span class="business-link">' + place.name + '</span>';
            }

		    var accessor = {
		        consumerSecret: auth.consumerSecret,
		        tokenSecret: auth.accessTokenSecret
		    };

		    var parameters = [];
		    parameters.push(['term', place.name]);
		    parameters.push(['phone', details.formatted_phone_number]);
		    parameters.push(['callback', 'cb']);
		    parameters.push(['oauth_consumer_key', auth.consumerKey]);
		    parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
		    parameters.push(['oauth_token', auth.accessToken]);
		    parameters.push(['oauth_signature_method', 'HMAC-SHA1']);

		    // make a call to the yelp api by phone number
		    var message = {
		        'action': 'http://api.yelp.com/v2/phone_search',
		        'method': 'GET',
		        'parameters': parameters
		    };

		    OAuth.setTimestampAndNonce(message);
		    OAuth.SignatureMethod.sign(message, accessor);

		    var parameterMap = OAuth.getParameterMap(message.parameters);
		    parameterMap.oauth_signature = OAuth.percentEncode(parameterMap.oauth_signature);

		    // parse the response data and format for the info window
		    $.ajax( {
		        'url': message.action,
		        'data': parameterMap,
		        'cache': true,
		        'dataType': 'jsonp',
		        'jsonpCallback': 'cb',
		        'success': function (data, textStats, XMLHttpRequest) {
			        if (data.total != 0) {
			        	var business = data.businesses[0];
                        if (business.url != null && business.url != '') {
	                        // Add a link to the location's website in the place's name.
	                        locName = locName + '<span class="right-align"><a target="_blank" href=' + business.url + '><img src="images/yelp_icon.png" alt="Yelp" height="24" width="24"></a></span>';
	                    }

                        if (business.rating_img_url != null && business.rating_img_url != '') {
                            businessRatingImg = '<p><img src=' + business.rating_img_url_small + ' alt="Yelp" height="10" width="50"></p>';
                        }
	                    
                        if (business.image_url != null && business.image_url != '') {
                            businessImage = '<p><img src=' + business.image_url + ' alt="Business Image" height="150" width="50%"></p>';
                        }
		    		}
		        },
		        'error': function (data, textStats, XMLHttpRequest) {
			        console.log('status code ' + data.status);
		        },
		        'complete': function (data, textStats, XMLHttpRequest) {
		            content = '<div class="infowindow"><h4>' +
		                      locName + '</h4>' +
		                      locStreet +
		                      locCityState +
		                      locPhone +
		                      locOpenHours +
		                      businessUrl +
		                      businessRatingImg +
		                      businessImage +
		                      '</div>';

		            infowindow.setContent(content);
		            infowindow.open(myMap, place.marker);
		        }
		    })
      	});
    };

    // object to store access information  
    var auth = {
        // Update with your auth tokens.
        consumerKey: "xOvnTKqvYeJ4aSpFLmNk7A",
        consumerSecret: "pbJGkbeTt_UleIRN6kXY4RbGy74",
        accessToken: "TveX7380YOUJ74isvEGXDIWwUIzDb5Uw",
        accessTokenSecret: "ETruAhE4t77M7NbkVO8lH71MWgQ",
        serviceProvider: {
            signatureMethod : "HMAC-SHA1"
        }
    };

    // initialize the map using the google places service
    function initMap () {
        latLng = new google.maps.LatLng(lat,lng);
        var mapOptions = {center: latLng,
                          zoom: 18,
                          mapTypeId: google.maps.MapTypeId.ROADMAP};

        myMap = new google.maps.Map(document.getElementById('gMap'), mapOptions);
        myMap.setCenter(latLng);
        var request = {
            location: latLng,
            radius: '500',
            types: ['restaurant','bar','shopping_mall','movie_theater','clothing_store','book_store']
        };

        infowindow = new google.maps.InfoWindow();
        service = new google.maps.places.PlacesService(myMap);
        service.nearbySearch(request, placesCallback);
    }

    // handle the place search response
    function placesCallback(results, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            for (var i = 0; i < results.length; i++) {
                var marker = createMarker(results[i]);

                results[i].marker = marker;
                results[i].matchedPlace = ko.observable(true);
                self.places.push(results[i]);
            }
        }
    }

    // attributes to determine whether to display the places list
    self.displayingList = ko.observable(true);
    self.toggleValue = ko.observable("-");

    // function to hide and show the places list
    self.toggleList = function () {
        if (self.displayingList()) {
            self.displayingList(false);
            self.toggleValue("+");
        } else {
            self.displayingList(true);
            self.toggleValue("-");
        }
    };

    // function to create the markers for the google map
    function createMarker(place) {
      var placeLoc = place.geometry.location;
      var marker = new google.maps.Marker( {
        map: myMap,
        position: place.geometry.location
      });

      // add listeners to the map to handle events
      google.maps.event.addListener(infowindow, 'closeclick', function() {
        self.currentPlace().marker.setAnimation(null);
        $('#' + place.id).removeClass("current-place");
      });

      google.maps.event.addListener(marker, 'click', function() {
        document.getElementById(place.id).scrollIntoView();
        $('#' + place.id).trigger('click');
	  });

      google.maps.event.addDomListener(window, 'resize', function() {
        myMap.panTo(latLng);
      });

      return marker;
    }

    initMap();
}

ko.applyBindings(new MyViewModel());
