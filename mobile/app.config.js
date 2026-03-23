// Load .env file for build-time secrets (like SDK download token)
require('dotenv').config();

export default {
  expo: {
    name: "Discover Pup",
    slug: "discover-pup",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.discoverpup.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Discover Pup needs your location only when checking in at a park to verify you're actually there.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Discover Pup needs your location only when checking in at a park to verify you're actually there."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.discoverpup.app",
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsDownloadToken: process.env.MAPBOX_SECRET_TOKEN
        }
      ]
    ],
    extra: {
      // Public token is safe to include - it's designed for client-side use
      mapboxAccessToken: ""
    }
  }
};

