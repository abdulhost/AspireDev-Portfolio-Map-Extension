<?php
/*
Plugin Name: AspireDev Portfolio Map Extension
Description: Extends portfolio post type with location taxonomy and interactive Indian map via shortcode.
Version: 1.8
Author: AspireDev
*/

// Register Location Taxonomy
function gpm_register_location_taxonomy() {
    $labels = array(
        'name'              => __('Locations', 'gaviasthemer'),
        'singular_name'     => __('Location', 'gaviasthemer'),
        'search_items'      => __('Search Locations', 'gaviasthemer'),
        'all_items'         => __('All Locations', 'gaviasthemer'),
        'parent_item'       => __('Parent Location', 'gaviasthemer'),
        'parent_item_colon' => __('Parent Location:', 'gaviasthemer'),
        'edit_item'         => __('Edit Location', 'gaviasthemer'),
        'update_item'       => __('Update Location', 'gaviasthemer'),
        'add_new_item'      => __('Add New Location', 'gaviasthemer'),
        'new_item_name'     => __('New Location Name', 'gaviasthemer'),
        'menu_name'         => __('Locations', 'gaviasthemer'),
    );

    $args = array(
        'hierarchical'      => true,
        'labels'            => $labels,
        'show_ui'           => true,
        'show_admin_column' => true,
        'query_var'         => true,
        'rewrite'           => array('slug' => 'location'),
    );

    register_taxonomy('location', array('portfolio'), $args);
}
add_action('init', 'gpm_register_location_taxonomy');

// Enqueue Leaflet.js, MarkerCluster, and Custom Scripts
function gpm_enqueue_scripts() {
    global $post;
    $has_shortcode = is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'portfolio_map');
    if ($has_shortcode) {
        wp_enqueue_style('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', array(), '1.9.4');
        wp_enqueue_style('markercluster-css', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css', array('leaflet-css'), '1.5.3');
        wp_enqueue_style('markercluster-default-css', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css', array('markercluster-css'), '1.5.3');
        wp_enqueue_script('leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', array(), '1.9.4', true);
        wp_enqueue_script('markercluster-js', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js', array('leaflet-js'), '1.5.3', true);
        wp_enqueue_script('gpm-map-js', plugin_dir_url(__FILE__) . 'map.js', array('leaflet-js', 'markercluster-js'), '1.8', true);
        wp_enqueue_style('gpm-map-css', plugin_dir_url(__FILE__) . 'map.css', array('leaflet-css', 'markercluster-css'), '1.8');

        $portfolios = gpm_get_portfolio_data();
        wp_localize_script('gpm-map-js', 'gpmData', array(
            'portfolios' => $portfolios['portfolios'],
            'categories' => $portfolios['categories'],
            'debug' => array(
                'shortcode_detected' => true,
                'portfolio_count' => count($portfolios['portfolios']),
                'category_count' => count($portfolios['categories']),
            ),
        ));

        wp_add_inline_script('gpm-map-js', 'console.log("Portfolio Map: Shortcode detected, portfolios: " + gpmData.debug.portfolio_count + ", categories: " + gpmData.debug.category_count);');
    }
}
add_action('wp_enqueue_scripts', 'gpm_enqueue_scripts');

// Get Portfolio Data for Map
function gpm_get_portfolio_data() {
    $args = array(
        'post_type'      => 'portfolio',
        'posts_per_page' => -1,
        'post_status'    => 'publish',
    );
    $query = new WP_Query($args);
    $portfolios = array();
    $categories = array();
    $category_colors = array();

    $city_coordinates = array(
        'delhi'          => array('lat' => 28.7041, 'lng' => 77.1025),
        'mumbai'         => array('lat' => 19.0760, 'lng' => 72.8777),
        'uttar-pradesh'  => array('lat' => 26.8467, 'lng' => 80.9462),
        'bihar'          => array('lat' => 25.5941, 'lng' => 85.1376),
        'kolkata'        => array('lat' => 22.5726, 'lng' => 88.3639),
        'chennai'        => array('lat' => 13.0827, 'lng' => 80.2707),
        'bengaluru'      => array('lat' => 12.9716, 'lng' => 77.5946),
        'hyderabad'      => array('lat' => 17.3850, 'lng' => 78.4867),
        'ahmedabad'      => array('lat' => 23.0225, 'lng' => 72.5714),
        'jaipur'         => array('lat' => 26.9124, 'lng' => 75.7873),
        'pune'           => array('lat' => 18.5204, 'lng' => 73.8567),
        'bhopal'         => array('lat' => 23.2599, 'lng' => 77.4126),
        'chandigarh'     => array('lat' => 30.7333, 'lng' => 76.7794),
        'guwahati'       => array('lat' => 26.1445, 'lng' => 91.7362),
    );

    $terms = get_terms(array('taxonomy' => 'category_portfolio', 'hide_empty' => false));
    foreach ($terms as $index => $term) {
        $color = sprintf('#%06X', mt_rand(0, 0xFFFFFF));
        $categories[$term->term_id] = array(
            'name'  => $term->name,
            'color' => $color,
        );
        $category_colors[$term->term_id] = $color;
    }

    while ($query->have_posts()) {
        $query->the_post();
        $post_id = get_the_ID();
        $terms = wp_get_post_terms($post_id, 'category_portfolio');
        $location_terms = wp_get_post_terms($post_id, 'location');
        $category_id = !empty($terms) ? $terms[0]->term_id : 0;
        $color = isset($category_colors[$category_id]) ? $category_colors[$category_id] : '#000000';

        $gallery = get_post_meta($post_id, 'portfolio_gallery', true);
        $image = '';
        if (is_array($gallery) && !empty($gallery)) {
            $image = reset($gallery);
        } elseif (has_post_thumbnail()) {
            $image = wp_get_attachment_url(get_post_thumbnail_id());
        }

        $lat = null;
        $lng = null;
        if (!empty($location_terms)) {
            $location_slug = strtolower($location_terms[0]->slug);
            if (isset($city_coordinates[$location_slug])) {
                $lat = $city_coordinates[$location_slug]['lat'];
                $lng = $city_coordinates[$location_slug]['lng'];
            }
        }

        if ($lat !== null && $lng !== null) {
            $portfolios[] = array(
                'id'        => $post_id,
                'title'     => get_the_title(),
                'excerpt'   => get_the_excerpt(),
                'permalink' => get_permalink(),
                'image'     => $image,
                'lat'       => $lat,
                'lng'       => $lng,
                'category_id' => $category_id,
                'color'     => $color,
            );
        }
    }
    wp_reset_postdata();

    return array(
        'portfolios' => $portfolios,
        'categories' => $categories,
    );
}

// Shortcode to Display Map
function gpm_map_shortcode() {
    $portfolios = gpm_get_portfolio_data();
    if (empty($portfolios['portfolios'])) {
        return '<p>No portfolios found with valid location coordinates. Please assign location terms (e.g., Delhi, Uttar Pradesh) to portfolios.</p>';
    }

    ob_start();
    ?>
    <div id="gpm-map" style="height: 500px; position: relative; z-index: 1;"></div>
    <?php
    return ob_get_clean();
}
add_shortcode('portfolio_map', 'gpm_map_shortcode');
?>