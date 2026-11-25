#include "wifi_hotspot.h"

#include <Arduino.h>
#include <WiFiNINA.h>
#include <utility/wifi_drv.h>

namespace
{

	const char SSID[] = "OpticalModule01";
	const char PASSPHRASE[] = "opticalmodule01";
	const uint8_t CHANNEL = 6;

	static_assert(sizeof(SSID) - 1 >= 1 && sizeof(SSID) - 1 <= WL_SSID_MAX_LENGTH,
								"SSID must be 1-32 characters");
	static_assert(sizeof(PASSPHRASE) - 1 >= 8 &&
										sizeof(PASSPHRASE) - 1 <= WL_WPA_KEY_MAX_LENGTH,
								"WPA2 passphrase must be 8-63 characters");

	const uint32_t POLL_INTERVAL_MS = 250;
	const uint32_t START_TIMEOUT_MS = 10000;
	const uint32_t RETRY_DELAY_MS = 5000;

	enum class State : uint8_t
	{
		Starting,
		Up,
		Failed
	};

	State state = State::Failed;
	uint32_t stateSince = 0;
	uint32_t lastPoll = 0;

	void enter(State next)
	{
		state = next;
		stateSince = millis();
	}

	void start()
	{
		const int8_t result = WiFiDrv::wifiSetApPassphrase(
				SSID, sizeof(SSID) - 1, PASSPHRASE, sizeof(PASSPHRASE) - 1, CHANNEL);
		enter(result == WL_FAILURE ? State::Failed : State::Starting);
	}

	void fail()
	{
		Serial.println(F("Hotspot failed, will retry"));
		enter(State::Failed);
	}

} // namespace

namespace Hotspot
{

	void begin()
	{
		WiFiDrv::wifiDriverInit();
		start();
	}

	void update()
	{
		const uint32_t now = millis();

		if (state == State::Failed)
		{
			if (now - stateSince >= RETRY_DELAY_MS)
			{
				start();
			}
			return;
		}

		if (now - lastPoll < POLL_INTERVAL_MS)
		{
			return;
		}
		lastPoll = now;

		const uint8_t status = WiFi.status();
		const bool running = status == WL_AP_LISTENING || status == WL_AP_CONNECTED;

		if (state == State::Starting)
		{
			if (running)
			{
				enter(State::Up);
				Serial.println(F("Hotspot up at http://192.168.4.1"));
			}
			else if (status == WL_AP_FAILED || now - stateSince >= START_TIMEOUT_MS)
			{
				fail();
			}
		}
		else if (!running)
		{
			fail();
		}
	}

	bool isUp() { return state == State::Up; }

}
