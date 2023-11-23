const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { exec } = require("child_process");

process.env.NODE_ENV = "dev";

const is_dev = process.env.NODE_ENV !== "production";

const RESOURCES_PATH = is_dev ? __dirname : process.resourcesPath;

let main_window;

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

  check_rclone((status) => {
    main_window.webContents.send("rclone:check", { status: status });
  });
  main_window.webContents.send("error", {
    message: "hello from the back-end",
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      create_main_window();
    }
  });
});

ipcMain.on("rclone:start", (e, data) => {
  const script_path = path.join(RESOURCES_PATH, "scripts", "run_rclone.ps1");
  const rclone_log_file = "C:\\rclone_log.txt";
  const rclone_config_file = "C:\\rclone.conf";
  const command = `$ErrorActionPreference = 'stop'
  try {
      $output = Start-Process powershell -Verb RunAs -Wait -PassThru -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -File ${script_path} ${data.rclone_path} ${rclone_log_file} ${rclone_config_file}"
      if ($output.ExitCode -ne 0) {
          exit 1
      }
      exit 0
  }
  catch {
      exit 1
  }`;
  exec(command, { shell: "powershell.exe" }, (error, stdout, stderr) => {
    if (error) {
      console.log(`Error on executing script: ${script_path}`);
    } else {
      main_window.webContents.send("rclone:started");
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
