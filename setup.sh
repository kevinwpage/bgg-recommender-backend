#!/usr/bin/env bash

# setup.sh — install dependencies for scraperService.js
# Run this from the root of your backend project

# Ensure you have a package.json
if [ ! -f package.json ]; then
  echo "Initializing npm project..."
  npm init -y
fi

# Install required packages
echo "Installing axios, cheerio, xml2js..."
npm install axios cheerio xml2js

echo "Dependencies installed. You can now run your scraperService.js and start the backend."
