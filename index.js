import "dotenv/config";

import { icsToJson } from "./lib/icsToJSON.js";
import { CozytouchAPI } from "./lib/CozytouchAPI.js";

const cozytouchClient = new CozytouchAPI(
  process.env.COZYTOUCH_LOGIN,
  process.env.COZYTOUCH_PASSWORD
);

const getYear = (date) => date.slice(0, 4);
const getMonth = (date) => date.slice(4, 6);
const getDay = (date) => date.slice(6, 8);

async function fetchAirbnbCalendar() {
  try {
    const icsRes = await fetch(process.env.AIRBNB_CALENDAR_URL);
    const icsData = await icsRes.text();
    const data = icsToJson(icsData);
    return data
      .filter((event) => event.summary === "Reserved")
      .map(({ endDate, startDate }) => ({
        startDate: `${getYear(startDate)}-${getMonth(startDate)}-${getDay(
          startDate
        )}`,
        endDate: `${getYear(endDate)}-${getMonth(endDate)}-${getDay(endDate)}`,
      }));
  } catch (error) {
    console.error(
      "Une erreur est survenue lors de la récupération du calendrier Airbnb",
      error
    );
  }
}

async function checkHeatersShouldBeActivated() {
  console.log("Starting task to check if heaters should be activated");
  try {
    const airbnbCalendar = await fetchAirbnbCalendar();
    const firstEvent = airbnbCalendar[0];
    const nowTs = Date.now();
    const shouldHeatersBeActivated = true
    //   new Date(firstEvent.startDate).getTime() <= nowTs &&
    //   new Date(firstEvent.endDate).getTime() >= nowTs;
    if (shouldHeatersBeActivated) {
      await cozytouchClient.login();
      const devices = await cozytouchClient.getDevices();
      const heatersURls = devices
        .filter(
          (device) =>
            device.uiClass === "WaterHeatingSystem" ||
            device.uiClass === "HeatingSystem"
        )
        .map((device) => ({
            commands: device.uiClass === 'WaterHeatingSystem' ? ['setActiveMode', 'off'] : ['prog'],
            deviceURL: device.deviceURL,
        }));

      await Promise.all(
        heatersURls.map(({deviceURL, commands}) =>
          cozytouchClient.getDeviceDefinition(deviceURL, commands)
        )
      );
      console.log("Heaters have been activated");
    } else {
      console.log("Heaters should not be activated");
    }
  } catch (error) {
    console.error(
      "An error occured while trying to activate the heaters",
      error
    );
  }
}

async function checkHeatersShouldBeDeactivated() {
  console.log("Starting task to check if heaters should be deactivated");
  try {
    const airbnbCalendar = await fetchAirbnbCalendar();
    const firstEvent = airbnbCalendar[0];
    const nowTs = Date.now();
    const shouldHeatersBeDeactivated =
      new Date(firstEvent.startDate).getTime() >= nowTs ||
      new Date(firstEvent.endDate).getTime() <= nowTs;
    if (shouldHeatersBeDeactivated) {
      await cozytouchClient.login();
      const devices = await cozytouchClient.getDevices();
      const heatersURls = devices
        .filter(
          (device) =>
            device.uiClass === "WaterHeatingSystem" ||
            device.uiClass === "HeatingSystem"
        )
        .map((device) => ({
            commands: device.uiClass === 'WaterHeatingSystem' ? ['setAbsenceMode', 'off'] : ['off'],
            deviceURL: device.deviceURL,
        }));

      await Promise.all(
        heatersURls.map(({deviceURL, commands}) =>
          cozytouchClient.setCommands(deviceURL, commands)
        )
      );
      console.log("Heaters have been deactivated");
    } else {
      console.log("Heaters should not be deactivated");
    }
  } catch (error) {
    console.error(
      "An error occured while trying to deactivate the heaters",
      error
    );
  }
}

const args = process.argv;

if (args.includes("--check-heaters-should-be-deactivated")) {
  checkHeatersShouldBeDeactivated();
} else {
  checkHeatersShouldBeActivated();
}
