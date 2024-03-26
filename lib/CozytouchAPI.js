export class CozytouchAPI {
  static baseURL = "https://apis.groupe-atlantic.com";
  static overKizURL =
    "https://ha110-1.overkiz.com/enduser-mobile-web/enduserAPI/";
  static clientID =
    "Q3RfMUpWeVRtSUxYOEllZkE3YVVOQmpGblpVYToyRWNORHpfZHkzNDJVSnFvMlo3cFNKTnZVdjBh";

  sessionCookie = null;

  constructor(user, password) {
    this.user = user;
    this.password = password;
  }

  async getAccessToken() {
    const request = await fetch(`${CozytouchAPI.baseURL}/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${CozytouchAPI.clientID}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "password",
        username: `GA-PRIVATEPERSON/${this.user}`,
        password: this.password,
      }),
    });

    const json = await request.json();

    if (typeof json.access_token !== "string") {
      throw new Error("No access token retrieves check your credentials");
    }

    return json.access_token;
  }

  async getJWT(accessToken) {
    const request = await fetch(
      `${CozytouchAPI.baseURL}/magellan/accounts/jwt`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const jwt = await request.text();
    if (!jwt || jwt.length === 0) {
      throw new Error("No jwt retrieves check your credentials");
    }
    return jwt.slice(1, jwt.length - 1);
  }

  async login() {
    const accessToken = await this.getAccessToken();
    this.jwt = await this.getJWT(accessToken);
    const request = await fetch(`${CozytouchAPI.overKizURL}login`, {
      method: "POST",
      body: new URLSearchParams({
        jwt: this.jwt,
      }),
    });

    const json = await request.json();

    if (!json.success) {
      throw new Error("Error while logging in");
    }

    this.sessionCookie = request.headers.get("set-cookie");
    console.log("Login success", json);

    return true;
  }

  async getDevices() {
    const request = await fetch(`${CozytouchAPI.overKizURL}setup/devices`, {
      method: "GET",
      headers: {
        Cookie: this.sessionCookie,
      },
    });
    const json = await request.json();

    if (request.status !== 200) {
      throw new Error("Error while fetching devices");
    }

    return json;
  }

  async getDeviceDefinition(deviceURL) {

    const request = await fetch(`${CozytouchAPI.overKizURL}setup/devices/${encodeURI(deviceURL)}`, {
      method: "GET",
      headers: {
        Cookie: this.sessionCookie,
      },
    });
    console.log('request', request)
    const json = await request.json();

    if (request.status !== 200) {
      throw new Error("Error while fetching device definition");
    }

    return json;
  }

  async setCommands(deviceURL, commands) {
    const payload = {
      label: "python-overkiz-api",
      actions: [{ deviceURL, commands }],
    };
    const request = await fetch(`${CozytouchAPI.overKizURL}exec/apply`, {
      method: "POST",
      headers: {
        Cookie: this.sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = await request.json();
    console.log("request", json);
    if (request.status !== 200) {
      throw new Error("Error while setting mode");
    }
    return true;
  }
}
