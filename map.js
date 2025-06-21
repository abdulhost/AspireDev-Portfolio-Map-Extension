document.addEventListener('DOMContentLoaded', function() {
    // console.log('Portfolio Map: Initializing...');
    
    var mapContainer = document.getElementById('gpm-map');
    if (!mapContainer) {
        // console.error('Portfolio Map: Map container #gpm-map not found.');
        return;
    }

    if (typeof gpmData === 'undefined' || !gpmData.portfolios) {
        // console.error('Portfolio Map: gpmData not defined or invalid.');
        return;
    }

    // Detect touch device
    var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Initialize map with India's bounds
    var map = L.map('gpm-map', {
        zoomControl: true,
        minZoom: 5,
        maxZoom: 15,
        renderer: L.canvas()
    });

    // console.log('Portfolio Map: Map initialized.');

    // Set initial bounds to cover India
    var indiaBounds = [
        [6.4627, 68.1097], // Southwest (Andaman & Nicobar)
        [35.6745, 97.3956] // Northeast (Arunachal Pradesh)
    ];
    map.fitBounds(indiaBounds, { padding: [50, 50], maxZoom: 6 });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 15,
        minZoom: 5,
        errorTileUrl: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png'
    }).addTo(map).on('tileerror', function(error, tile) {
        // console.warn('Portfolio Map: Tile failed to load: ', error, tile);
    });

    // Create a marker cluster group
    var markerCluster = L.markerClusterGroup({
        disableClusteringAtZoom: 10,
        maxClusterRadius: 30,
        iconCreateFunction: function(cluster) {
            var markers = cluster.getAllChildMarkers();
            var count = markers.length;
            var color = markers[0].options.fillColor;
            return L.divIcon({
                html: '<div class="cluster-marker" style="background-color: ' + color + ';">' + count + '</div>',
                className: 'cluster-icon',
                iconSize: [20, 20]
            });
        }
    });

    // Group portfolios by location
    var portfoliosByLocation = {};
    gpmData.portfolios.forEach(function(portfolio) {
        var key = portfolio.lat + ',' + portfolio.lng;
        if (!portfoliosByLocation[key]) {
            portfoliosByLocation[key] = [];
        }
        portfoliosByLocation[key].push(portfolio);
    });

    // Add markers with offset
    Object.keys(portfoliosByLocation).forEach(function(key) {
        var portfolios = portfoliosByLocation[key];
        var lat = parseFloat(key.split(',')[0]);
        var lng = parseFloat(key.split(',')[1]);

        if (portfolios.length === 1) {
            var portfolio = portfolios[0];
            var marker = L.circleMarker([lat, lng], {
                radius: 14,
                fillColor: portfolio.color,
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });

            var popupContent = '<div class="gpm-popup">';
            if (portfolio.image) {
                popupContent += '<img src="' + portfolio.image + '" alt="' + portfolio.title + '" />';
            }
            popupContent += '<h3>' + portfolio.title + '</h3>';
            popupContent += '<p>' + portfolio.excerpt + '</p>';
            popupContent += '<a href="' + portfolio.permalink + '" target="_blank">View Project</a>';
            popupContent += '</div>';

            var popup = L.popup({ autoClose: false, closeOnClick: false })
                .setContent(popupContent);

            marker.bindPopup(popup);

            var isHovering = false;

            if (!isTouchDevice) {
                // Desktop: Hover events
                L.DomEvent.on(marker, 'mouseover', function() {
                    // console.log('Portfolio Map: Mouseover on marker, opening popup for ' + portfolio.title);
                    isHovering = true;
                    marker.openPopup();
                });

                marker.on('popupopen', function() {
                    // console.log('Portfolio Map: Popup opened for ' + portfolio.title);
                    var popupElement = this.getPopup().getElement();
                    L.DomEvent.on(popupElement, 'mouseover', function() {
                        // console.log('Portfolio Map: Mouseover on popup');
                        isHovering = true;
                    });
                    L.DomEvent.on(popupElement, 'mouseout', function(e) {
                        // console.log('Portfolio Map: Mouseout from popup');
                        isHovering = false;
                        setTimeout(() => {
                            if (!isHovering) {
                                marker.closePopup();
                                // console.log('Portfolio Map: Popup closed (left popup)');
                            }
                        }, 50);
                    });
                });

                L.DomEvent.on(marker, 'mouseout', function(e) {
                    // console.log('Portfolio Map: Mouseout from marker for ' + portfolio.title);
                    isHovering = false;
                    setTimeout(() => {
                        if (!isHovering) {
                            marker.closePopup();
                            // console.log('Portfolio Map: Popup closed (left marker)');
                        }
                    }, 50);
                });
            } else {
                // Mobile: Touch events
                L.DomEvent.on(marker, 'touchstart', function(e) {
                    // console.log('Portfolio Map: Touchstart on marker for ' + portfolio.title);
                    L.DomEvent.stopPropagation(e); // Prevent map interaction
                    if (!marker.getPopup().isOpen()) {
                        marker.openPopup();
                    } else {
                        marker.closePopup();
                    }
                });
            }

            L.DomEvent.on(marker, 'click', function() {
                // console.log('Portfolio Map: Clicked marker for ' + portfolio.title);
                map.flyToBounds([[lat, lng]], {
                    padding: [50, 50],
                    maxZoom: 10,
                    duration: 1.2,
                    animate: true
                });
            });

            markerCluster.addLayer(marker);
        } else {
            portfolios.forEach(function(portfolio, index) {
                var offset = (index - (portfolios.length - 1) / 2) * 0.015;
                var markerLat = lat + offset;
                var markerLng = lng + offset;

                var marker = L.circleMarker([markerLat, markerLng], {
                    radius: 14,
                    fillColor: portfolio.color,
                    color: '#000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });

                var popupContent = '<div class="gpm-popup">';
                if (portfolio.image) {
                    popupContent += '<img src="' + portfolio.image + '" alt="' + portfolio.title + '" />';
                }
                popupContent += '<h3>' + portfolio.title + '</h3>';
                popupContent += '<p>' + portfolio.excerpt + '</p>';
                popupContent += '<a href="' + portfolio.permalink + '" target="_blank">View Project</a>';
                popupContent += '</div>';

                var popup = L.popup({ autoClose: false, closeOnClick: false })
                    .setContent(popupContent);

                marker.bindPopup(popup);

                var isHovering = false;

                if (!isTouchDevice) {
                    L.DomEvent.on(marker, 'mouseover', function() {
                        // console.log('Portfolio Map: Mouseover on marker, opening popup for ' + portfolio.title);
                        isHovering = true;
                        marker.openPopup();
                    });

                    marker.on('popupopen', function() {
                        // console.log('Portfolio Map: Popup opened for ' + portfolio.title);
                        var popupElement = this.getPopup().getElement();
                        L.DomEvent.on(popupElement, 'mouseover', function() {
                            // console.log('Portfolio Map: Mouseover on popup');
                            isHovering = true;
                        });
                        L.DomEvent.on(popupElement, 'mouseout', function(e) {
                            // console.log('Portfolio Map: Mouseout from popup');
                            isHovering = false;
                            setTimeout(() => {
                                if (!isHovering) {
                                    marker.closePopup();
                                    // console.log('Portfolio Map: Popup closed (left popup)');
                                }
                            }, 50);
                        });
                    });

                    L.DomEvent.on(marker, 'mouseout', function(e) {
                        // console.log('Portfolio Map: Mouseout from marker for ' + portfolio.title);
                        isHovering = false;
                        setTimeout(() => {
                            if (!isHovering) {
                                marker.closePopup();
                                // console.log('Portfolio Map: Popup closed (left marker)');
                            }
                        }, 50);
                    });
                } else {
                    L.DomEvent.on(marker, 'touchstart', function(e) {
                        // console.log('Portfolio Map: Touchstart on marker for ' + portfolio.title);
                        L.DomEvent.stopPropagation(e);
                        if (!marker.getPopup().isOpen()) {
                            marker.openPopup();
                        } else {
                            marker.closePopup();
                        }
                    });
                }

                L.DomEvent.on(marker, 'click', function() {
                    // console.log('Portfolio Map: Clicked marker for ' + portfolio.title);
                    var locationBounds = [];
                    portfolios.forEach(function(p, i) {
                        var offsetLat = lat + (i - (portfolios.length - 1) / 2) * 0.015;
                        var offsetLng = lng + (i - (portfolios.length - 1) / 2) * 0.015;
                        locationBounds.push([offsetLat, offsetLng]);
                    });
                    map.flyToBounds(locationBounds, {
                        padding: [50, 50],
                        maxZoom: 12,
                        duration: 1.2,
                        animate: true
                    });
                });

                markerCluster.addLayer(marker);
            });
        }
    });

    map.addLayer(markerCluster);

    // Close popups when mouse/touch leaves map
    L.DomEvent.on(mapContainer, isTouchDevice ? 'touchend' : 'mouseout', function(e) {
        // console.log('Portfolio Map: ' + (isTouchDevice ? 'Touchend' : 'Mouseout') + ' from map container');
        if (!mapContainer.contains(e.relatedTarget || e.target)) {
            markerCluster.eachLayer(function(layer) {
                if (layer.getPopup && layer.getPopup() && layer.getPopup().isOpen()) {
                    layer.closePopup();
                    // console.log('Portfolio Map: Popup closed (left map)');
                }
            });
        }
    });

    // Add legend as a Leaflet control
    var legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
        // console.log('Portfolio Map: Adding legend control');
        var div = L.DomUtil.create('div', 'gpm-legend leaflet-control');
        var html = '<h4>Categories</h4><ul>';
        if (gpmData.categories) {
            Object.keys(gpmData.categories).forEach(function(id) {
                var cat = gpmData.categories[id];
                html += '<li><span class="legend-color" style="background-color: ' + cat.color + ';"></span> ' + cat.name + '</li>';
            });
        }
        html += '</ul>';
        div.innerHTML = html;
        return div;
    };
    legend.addTo(map);

    // console.log('Portfolio Map: Initialized with ' + Object.keys(portfoliosByLocation).length + ' locations, touch device: ' + isTouchDevice);
});