const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { exec, execSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const { readJsonSync, writeJsonSync } = require("fs-extra");

process.env.NODE_ENV = "development";

const is_dev = process.env.NODE_ENV !== "production";

const RESOURCES_PATH = is_dev ? __dirname : process.resourcesPath;

let main_window;

// globals
const user_home_dir = os.homedir();
const application_dir = user_home_dir + "\\rclone_service_manager";
const application_conf_file =
  application_dir + "\\thisapplicationconfigfile.json";
const rclone_logs_dir = application_dir + "\\rclone_logs";
let rclone_path;
let conf_data;
let rclone_services = {};
const rclone_services_file = application_dir + "\\servicesconf.json";

function sync_services() {
  Object.keys(rclone_services).forEach((service_name) => {
    check_rclone(service_name);
  });

  save_rclone_services();
}

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
    main_window.webContents.send("startup:first", {});
    return false;
  }

  if (services_exists) {
    rclone_services = readJsonSync(rclone_services_file);
  } else {
    rclone_services = {};
    writeJsonSync(rclone_services_file, rclone_services);
  }

  setInterval(sync_services, 5_000);

  return true;
}

function remove_rclone(service_name) {
  if (service_name in rclone_services) {
    const config_file = rclone_services[service_name].config_file;
    delete rclone_services[service_name];
    if (fs.existsSync(config_file)) {
      fs.rmSync(config_file);
    }
  }
}

function update_application_conf(new_conf = {}) {
  for (const conf in new_conf) {
    conf_data[conf] = new_conf[conf];
  }
  writeJsonSync(application_conf_file, conf_data);
}

function check_rclone(service_name) {
  const command = `Get-Service -Name ${service_name} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status`;
  let output = "";
  try {
    output = execSync(command, { shell: "powershell.exe" });
    const stdout = output.toString();
    if (stdout.trim().length > 0) {
      if (stdout.trim() === "Running") {
        rclone_services[service_name].status = true;
        main_window.webContents.send("rclone:toggled", {
          service_name,
          status: true,
        });
      } else if (stdout.trim() === "Stopped") {
        rclone_services[service_name].status = false;
        main_window.webContents.send("rclone:toggled", {
          service_name,
          status: false,
        });
      }
    }
  } catch {
    remove_rclone(service_name);
    main_window.webContents.send("rclone:removed", {
      service_name,
    });
  }
}

async function create_main_window() {
  main_window = new BrowserWindow({
    title: "Burna",
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

  if (startup()) {
    if (rclone_path) {
      main_window.webContents.send("rclone:path", { rclone_path });
    }

    Object.keys(rclone_services).forEach((service_name) => {
      main_window.webContents.send("rclone:created", {
        service_name,
        bucket: rclone_services[service_name].bucket,
      });
      check_rclone(service_name);
    });

    save_rclone_services();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      create_main_window();
    }
  });
});

function create_config_file(data) {
  const config_file_template =
    "# last modified on {last_mod_date}\n" +
    "[monster]\n" +
    "type = swift\n" +
    "env_auth = false\n" +
    "user = {username}\n" +
    "key = {password}\n" +
    "region = us-east-1\n" +
    "auth = https://api.zdrive.ir/auth/v1.0";

  const username = data.username;
  const password = data.password;
  const update = data.update;
  const bucket = data.bucket ? data.bucket : "__undefined__";

  if (!username || !password) {
    return -1;
  }

  if (
    username.includes(" ") ||
    password.includes(" ") ||
    data.service_name.includes(" ") ||
    bucket.includes(" ")
  ) {
    return -2;
  }
  fs.existsSync(application_dir) ||
    fs.mkdirSync(application_dir, { recursive: true });

  const config_file = application_dir + `\\${data.service_name}.conf`;

  if (fs.existsSync(config_file) && !update) {
    return 1; // config file exists. so we need to use it or overwrite it.
  }

  const ready_to_write = config_file_template
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
    data.service_name
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

  const shell_escape = (arg) => {
    if (/[^A-Za-z0-9_\/:=-]/.test(arg))
      return arg.replace(/([$!"();`*?{}[\]<>&%#~@\\])/g, "\\`$1");
    return arg;
  };

  const service_name = data.service_name.trim();
  const extra_args = data.extra_args.trim();
  const bucket = data.bucket ? data.bucket.trim() : undefined;

  const update = data.update;
  if (update) {
    if (service_name in rclone_services) {
      if (rclone_services[service_name].status) {
        main_window.webContents.send("error", {
          message: "First, please turn off service.",
        });
      } else {
        rclone_services[service_name] = {
          config_file: rclone_config_file,
          log_file: rclone_log_file,
          rclone_path: rclone_path,
          bucket: data.bucket,
          status: false,
        };
        save_rclone_services();

        main_window.webContents.send("info", {
          message: "Service has been updated.",
        });
      }
    } else {
      remove_rclone(service_name);
      save_rclone_services();

      main_window.webContents.send("error", {
        message: "Service does not exist.",
      });
      main_window.webContents.send("rclone:removed", {
        service_name,
      });
    }

    return;
  }

  const args = [
    rclone_path,
    rclone_log_file,
    rclone_config_file,
    bucket ? bucket : undefined,
    service_name,
    extra_args,
  ];
  const escapedArgs = args.map((arg) =>
    arg !== undefined ? arg.replace(/"/g, '`"') : "__undefined__"
  );

  const command = `$ErrorActionPreference = 'stop'
  try {
      $output = Start-Process powershell -Verb RunAs -Wait -PassThru -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -File \`"${script_path}\`" ${escapedArgs.join(
    " "
  )}"
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
        fs.rmSync(rclone_config_file);
      } else if (error.code === -2) {
        console.log(`Error on executing script: ${script_path}`);
        main_window.webContents.send("error", {
          message: `service with name ${service_name} already exists`,
        });
        fs.rmSync(rclone_config_file);
      } else if (error.code === 1) {
        console.log(`Error on executing script: ${script_path}`);
        main_window.webContents.send("rclone:created", {
          service_name,
          bucket: data.bucket,
        });
        fs.rmSync(rclone_config_file);
        main_window.webContents.send("error", {
          message: `can not start service ${service_name}`,
        });
        rclone_services[service_name] = {
          config_file: rclone_config_file,
          log_file: rclone_log_file,
          rclone_path: rclone_path,
          bucket: data.bucket,
          status: false,
        };
        save_rclone_services();
      } else if (error.code === 0) {
        main_window.webContents.send("rclone:created", {
          service_name,
          bucket: data.bucket,
        });
        main_window.webContents.send("info", {
          message: `service ${service_name} started`,
        });
        main_window.webContents.send("rclone:toggled", {
          service_name,
          status: true,
        });
        rclone_services[service_name] = {
          config_file: rclone_config_file,
          log_file: rclone_log_file,
          rclone_path: rclone_path,
          bucket: data.bucket,
          status: true,
        };
        save_rclone_services();
      } else {
        console.log(`unknown error on script: ${script_path}`);
        main_window.webContents.send("error", {
          message: "unknown error",
        });
        fs.rmSync(rclone_config_file);
      }
    } else {
      main_window.webContents.send("rclone:created", {
        service_name,
        bucket: data.bucket,
      });
      main_window.webContents.send("info", {
        message: `service ${service_name} started`,
      });
      main_window.webContents.send("rclone:toggled", {
        service_name,
        status: true,
      });
      rclone_services[service_name] = {
        config_file: rclone_config_file,
        log_file: rclone_log_file,
        rclone_path: rclone_path,
        bucket: data.bucket,
        status: true,
      };
      save_rclone_services();
    }
  });
});

ipcMain.on("rclone:toggle", (e, data) => {
  const service_name = data.service_name;
  const status = data.status;

  const script_path = path.join(RESOURCES_PATH, "scripts", "toggle_rclone.ps1");
  const command = `$ErrorActionPreference = 'stop'
  try {
      $output = Start-Process powershell -Verb RunAs -Wait -PassThru -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -File ${script_path} ${service_name} ${status}"
      exit $output.ExitCode
  }
  catch {
    exit 100
  }`;
  exec(command, { shell: "powershell.exe" }, (error, stdout, stderr) => {
    if (error) {
      if (error.code === 0) {
        rclone_services[service_name]["status"] = status;
        main_window.webContents.send("rclone:toggled", {
          service_name,
          status,
        });
        main_window.webContents.send("info", {
          message: "service toggled",
        });
      } else if (error.code === -1) {
        main_window.webContents.send("error", {
          message: "can not toggle service",
        });
      } else if (error.code === 1) {
        main_window.webContents.send("error", {
          message: "service does not exist",
        });
        main_window.webContents.send("rclone:removed", {
          service_name,
        });
        main_window.webContents.send("info", {
          message: "service removed",
        });
        remove_rclone(service_name);
        save_rclone_services();
      } else if (error.code === 2) {
        main_window.webContents.send("error", {
          message: "unknown status",
        });
      } else {
        main_window.webContents.send("error", {
          message: "unknown error",
        });
      }
    } else {
      rclone_services[service_name]["status"] = status;
      main_window.webContents.send("rclone:toggled", { service_name, status });
      main_window.webContents.send("info", {
        message: "service toggled",
      });
    }
    save_rclone_services();
  });
});

ipcMain.on("rclone:remove", (e, data) => {
  const service_name = data.service_name;

  const script_path = path.join(RESOURCES_PATH, "scripts", "remove_rclone.ps1");
  const command = `$ErrorActionPreference = 'stop'
  try {
      $output = Start-Process powershell -Verb RunAs -Wait -PassThru -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -File ${script_path} ${service_name}"
      exit $output.ExitCode
  }
  catch {
    exit 100
  }`;
  exec(command, { shell: "powershell.exe" }, (error, stdout, stderr) => {
    if (error) {
      if (error.code === 0) {
        main_window.webContents.send("rclone:removed", {
          service_name,
        });
        main_window.webContents.send("info", {
          message: "service removed",
        });
        remove_rclone(service_name);
        save_rclone_services();
      } else if (error.code === -1) {
        main_window.webContents.send("error", {
          message: "service does not exist",
        });
        main_window.webContents.send("rclone:removed", {
          service_name,
        });
        remove_rclone(service_name);
        save_rclone_services();
      } else if (error.code === 1) {
        main_window.webContents.send("error", {
          message: "can not delete service",
        });
      } else {
        main_window.webContents.send("error", {
          message: "unknown error",
        });
      }
    } else {
      main_window.webContents.send("rclone:removed", {
        service_name,
      });
      main_window.webContents.send("info", {
        message: "service removed",
      });
      remove_rclone(service_name);
      save_rclone_services();
    }
  });
});

ipcMain.on("install:yes", (e, data) => {
  const script_path = path.join(
    RESOURCES_PATH,
    "scripts",
    "install_dependencies.ps1"
  );
  const command = `$ErrorActionPreference = 'stop'

  try {
      $process = Start-Process powershell -Verb RunAs -Wait -PassThru -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -File ${script_path}"
      $exitCode = $process.ExitCode
      exit $exitCode
  }
  catch {
      exit 100
  }`;

  exec(command, { shell: "powershell.exe" }, (error, stdout, stderr) => {
    if (error) {
      console.log("install fail");
      main_window.webContents.send("install:fail", {});
    } else {
      main_window.webContents.send("install:success", {});
      conf_data = {};
      writeJsonSync(application_conf_file, conf_data);
    }
  });
});

ipcMain.on("install:no", (e, data) => {
  conf_data = {};
  writeJsonSync(application_conf_file, conf_data);

  if (startup()) {
    if (rclone_path) {
      main_window.webContents.send("rclone:path", { rclone_path });
    }

    Object.keys(rclone_services).forEach((service_name) => {
      main_window.webContents.send("rclone:created", {
        service_name,
        bucket: rclone_services[service_name].bucket,
      });
      check_rclone(service_name);
    });

    save_rclone_services();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      create_main_window();
    }
  });
});
