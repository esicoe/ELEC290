#include <Arduino.h>

#include "web_server.h"
#include "wifi_hotspot.h"

void setup() {
  Serial.begin(115200);
  Hotspot::begin();
  WebServer::begin();
}

void loop() {
  Hotspot::update();
  WebServer::update();
}
