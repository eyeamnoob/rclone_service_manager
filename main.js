const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { exec } = require("child_process");
const fs = require("node:fs");
const os = require("node:os");
const { readJsonSync, writeJsonSync } = require("fs-extra");

process.env.NODE_ENV = "dev";

const is_dev = process.env.NODE_ENV !== "production";

const RESOURCES_PATH = is_dev ? __dirname : process.resourcesPath;

let main_window;

// globals
const user_home_dir = os.homedir();
const application_dir = user_home_dir + "\\rclone_service_manager";
const application_conf_file =
  application_dir + "\\thisapplicationconfigfile.conf";
const rclone_logs_dir = application_dir + "\\rclone_logs";
let rclone_path;
let conf_data;
let rclone_services = {};
const rclone_services_file = application_dir + "\\servicesconf.json";

function startup() {
  fs.existsSync(application_dir) ||
    fs.mkdirSync(application_dir, { recursive: true });

  fs.existsSync(rclone_logs_dir) ||
    fs.mkdirSync(rclone_logs_dir, { recursive: true });

  const conf_exists = fs.existsSync(application_conf_file);
  const services_exists = fs.existsSync(rclone_services_file);

  if (conf_exists) {
    conf_data = readJsonSync(application_conf_file);
    rclone_path = conf_data.rclone_path;
  } else {
    conf_data = {};
    writeJsonSync(application_conf_file, conf_data);
  }

  if (services_exists) {
    rclone_services = readJsonSync(rclone_services_file);
  } else {
    rclone_services = {};
    writeJsonSync(rclone_services_file, rclone_services);
  }
}

function update_application_conf(new_conf = {}) {
  for (const conf in new_conf) {
    conf_data[conf] = new_conf[conf];
  }
  console.log(conf_data);
  writeJsonSync(application_conf_file, conf_data);
}

function check_rclone(callback) {
  const command =
    "Get-Service -Name Rclone -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status";
  const output = exec(
    command,
    { shell: "powershell.exe" },
    (error, stdout, stderr) => {
      if (error) {
        callback("stopped");
      } else {
        if (stdout.trim().length > 0) {
          if (stdout.trim() === "Running") {
            callback("running");
          } else if (stdout.trim() === "Stopped") {
            callback("stopped");
          } else {
            callback("stopped");
          }
        } else {
          callback("stopped");
        }
      }
    }
  );
}

async function create_main_window() {
  main_window = new BrowserWindow({
    title: "manage rclone services",
    width: 1000,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: true,
    },
  });

  if (is_dev) {
    main_window.webContents.openDevTools();
  }

  main_window.removeMenu();

  await main_window.loadFile(path.join(__dirname, "./front/main.html"));
}

app.whenReady().then(async () => {
  await create_main_window();

  startup();

  if (rclone_path) {
    main_window.webContents.send("rclone:path", { rclone_path });
  }

  Object.keys(rclone_services).forEach((service_name) => {
    const service = rclone_services[service_name];
    main_window.webContents.send("rclone:created", {
      service_name: service_name,
    });
    if (service.status === "running") {
      main_window.webContents.send("rclone:started", {
        service_name: service_name,
      });
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      create_main_window();
    }
  });
});

function create_config_file(data) {
  const config_file_template =
    "# last modified on {last_mod_date}\n" +
    "[{name}]\n" +
    "type = swift\n" +
    "env_auth = false\n" +
    "user = {username}\n" +
    "key = {password}\n" +
    "region = us-east-1\n" +
    "auth = https://api.zdrive.ir/auth/v1.0";

  const username = data.username;
  const password = data.password;
  const endpoint = data.endpoint;

  if (!username || !password || !endpoint) {
    return -1;
  }

  if (
    username.includes(" ") ||
    password.includes(" ") ||
    endpoint.includes(" ") ||
    data.service_name.includes(" ")
  ) {
    return -2;
  }
  fs.existsSync(application_dir) ||
    fs.mkdirSync(application_dir, { recursive: true });

  const config_file = application_dir + `\\${endpoint}.conf`;

  if (fs.existsSync(config_file)) {
    return 1; // config file exists. so we need to use it or overwrite it.
  }

  const ready_to_write = config_file_template
    .replace("{name}", endpoint)
    .replace("{username}", username)
    .replace("{password}", password)
    .replace("{last_mod_date}", new Date());

  fs.writeFileSync(config_file, ready_to_write);

  return config_file;
}

function save_rclone_services() {
  writeJsonSync(rclone_services_file, rclone_services);
}

ipcMain.on("rclone:start", (e, data) => {
  const script_path = path.join(RESOURCES_PATH, "scripts", "run_rclone.ps1");
  const rclone_log_file = `${application_dir}\\rclone_logs\\${
    data.endpoint
  }_log_${new Date().toISOString().replaceAll(":", "-")}.txt`;
  const rclone_config_file = create_config_file(data);

  if (rclone_config_file == 1) {
    console.log("config file already exists");
    main_window.webContents.send("error", {
      message: "config file already exists",
    });
    return;
  } else if (rclone_config_file == -1) {
    console.log("provide all required informations");
    main_window.webContents.send("error", {
      message: "provide all required informations",
    });
    return;
  } else if (rclone_config_file == -2) {
    console.log("provided informations can't have spaces");
    main_window.webContents.send("error", {
      message: "provided informations can't have spaces",
    });
    return;
  }

  if (data.rclone_path !== rclone_path) {
    rclone_path = data.rclone_path;
    update_application_conf({ rclone_path });
  }

  const service_name = data.service_name;

  const command = `$ErrorActionPreference = 'stop'
  try {
      $output = Start-Process powershell -Verb RunAs -Wait -PassThru -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -File ${script_path} ${rclone_path} ${rclone_log_file} ${rclone_config_file} ${data.endpoint} ${service_name}"
      exit $output.ExitCode
  }
  catch {
    exit 100
  }`;
  exec(command, { shell: "powershell.exe" }, (error, stdout, stderr) => {
    if (error) {
      if (error.code === -1) {
        console.log(`Error on executing script: ${script_path}`);
        main_window.webContents.send("error", {
          message: `can not create service ${service_name}`,
        });
      } else if (error.code === -2) {
        console.log(`Error on executing script: ${script_path}`);
        main_window.webContents.send("error", {
          message: `service with name ${service_name} already exists`,
        });
      } else if (error.code === 1) {
        console.log(`Error on executing script: ${script_path}`);
        main_window.webContents.send("rclone:created", {
          service_name: service_name,
        });
        main_window.webContents.send("error", {
          message: `can not start service ${service_name}`,
        });
        rclone_services[service_name] = {
          config_file: rclone_config_file,
          log_file: rclone_log_file,
          rclone_path: rclone_path,
          end_point: data.endpoint,
          status: "stopped",
        };
        save_rclone_services();
      } else if (error.code === 0) {
        main_window.webContents.send("rclone:created", {
          service_name: service_name,
        });
        main_window.webContents.send("info", {
          message: `service ${service_name} started`,
        });
        main_window.webContents.send("rclone:started", {
          service_name: service_name,
        });
        rclone_services[service_name] = {
          config_file: rclone_config_file,
          log_file: rclone_log_file,
          rclone_path: rclone_path,
          end_point: data.endpoint,
          status: "running",
        };
        save_rclone_services();
      } else {
        console.log(`unknown error on script: ${script_path}`);
        main_window.webContents.send("error", {
          message: "unknown error",
        });
      }
    } else {
      main_window.webContents.send("rclone:created", {
        service_name: service_name,
      });
      main_window.webContents.send("info", {
        message: `service ${service_name} started`,
      });
      main_window.webContents.send("rclone:started", {
        service_name: service_name,
      });
      rclone_services[service_name] = {
        config_file: rclone_config_file,
        log_file: rclone_log_file,
        rclone_path: rclone_path,
        end_point: data.endpoint,
        status: "running",
      };
      save_rclone_services();
    }
  });
});

ipcMain.on("rclone:stop", (e, data) => {
  const script_path = path.join(RESOURCES_PATH, "scripts", "stop_rclone.ps1");
  const command = `Start-Process powershell -verb runas -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -file ${script_path}"`;
  exec(command, { shell: "powershell.exe" }, (error, stdout, stderr) => {
    if (error) {
      console.log("Error on executing script", error);
    } else {
      main_window.webContents.send("rclone:stopped");
    }
  });
});

ipcMain.on("service:create", (e, data) => {
  const script_path = path.join(
    RESOURCES_PATH,
    "scripts",
    "create_service.ps1"
  );
  const name = data.name;
  const user_command = data.command;
  const command = `$ErrorActionPreference = 'stop'
  try {
      $output = Start-Process powershell -Verb RunAs -Wait -PassThru -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -File '${script_path}' '${name}' '${user_command}'"
      if ($output.ExitCode -ne 0) {
          exit 1
      }
      exit 0
  }
  catch {
      exit 1
  }`;
  console.log(command);
  exec(command, { shell: "powershell.exe" }, (error, stdout, stderr) => {
    if (error) {
      console.log(`Error on executing script: ${script_path}`);
    } else {
      main_window.webContents.send("service:created", {
        name,
        command: user_command,
        status: "stopped",
      });
    }
  });
});
