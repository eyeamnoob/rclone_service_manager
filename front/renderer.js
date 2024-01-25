const services_table_body = document.querySelector("#services-table tbody");
const create_service_button = document.getElementById("create-service-btn");
const create_service_form = document.getElementById("create-service-form");
const submit_button = document.getElementById("submit-btn");
const run_rclone_button = document.getElementById("run-rclone-btn");
const services_table = document.getElementById("services-table");
const file_input = document.getElementById("file-input");
const service_name_input = document.getElementById("service-name");
const username_input = document.getElementById("username");
const password_input = document.getElementById("password");
const endpoint_input = document.getElementById("endpoint");
const rclone_path_txt = document.getElementById("rclone-path");
let rclone_path = "";

let is_rclone_running = false;

// document.addEventListener("DOMContentLoaded", () => {
//   submit_button.addEventListener("click", function (event) {
//     event.preventDefault();

//     const name_input = document.getElementById("name");
//     const command_input = document.getElementById("command");
//     const status_input = document.getElementById("status");

//     const name = name_input.value;
//     const command = command_input.value;
//     const status = status_input.checked;

//     IPCRenderer.send("service:create", { name, command, status });

//     // new_service_row(name, command, status);

//     name_input.value = "";
//     command_input.value = "";
//     status_input.checked = false;

//     create_service_form.classList.add("hidden");
//   });
// });

function new_service_row(name, command, status) {
  const new_row = document.createElement("tr");

  const name_cell = document.createElement("td");

  const name_text = document.createTextNode(` ${name}`);

  name_cell.appendChild(name_text);

  const command_cell = document.createElement("td");

  command_text = document.createTextNode(` ${command}`);

  command_cell.appendChild(command_text);

  const status_cell = document.createElement("td");

  const status_logo = document.createElement("i");
  let status_text;
  if (status) {
    status_logo.classList = "fas fa-circle text-blue";
    status_text = document.createTextNode(" running");
  } else {
    status_logo.classList = "fas fa-circle text-red";
    status_text = document.createTextNode(" stopped");
  }

  status_cell.appendChild(status_logo);
  status_cell.appendChild(status_text);

  new_row.appendChild(name_cell);
  new_row.appendChild(command_cell);
  new_row.appendChild(status_cell);

  new_row.id = name;
  services_table_body.appendChild(new_row);
}

file_input.addEventListener("change", () => {
  rclone_path = file_input.files[0].path;
  rclone_path_txt.innerText = "Using Rclone: " + rclone_path;
  rclone_path_txt.style.display = "block";
  submitForm();
});

// run_rclone_button.addEventListener("click", function (event) {
//   if (is_rclone_running) {
//     IPCRenderer.send("rclone:stop", {});
//   } else {
//     if (rclone_path.length === 0) {
//       file_input.click();
//     } else {
//       IPCRenderer.send("rclone:start", { rclone_path });
//     }
//   }
//   is_rclone_running = !is_rclone_running;
// });

function openForm() {
  var overlay = document.getElementById("overlay");
  var popup = document.getElementById("popupContainer");

  overlay.style.display = "block";
  popup.style.display = "block";
}

function closeForm() {
  var overlay = document.getElementById("overlay");
  var popup = document.getElementById("popupContainer");

  overlay.style.display = "none";
  popup.style.display = "none";
}

function submitForm() {
  if (rclone_path.length === 0) {
    file_input.click();
    return;
  }

  const username = username_input.value;
  const password = password_input.value;
  const endpoint = endpoint_input.value;
  let service_name = service_name_input.value;

  if (!service_name) {
    service_name = "Rclone" + crypto.randomUUID();
  }

  console.log("uesrname:", username);
  console.log("password:", password);
  console.log("endpoint:", endpoint);
  console.log("service_name:", service_name);
  console.log("rclone_path:", rclone_path);

  IPCRenderer.send("rclone:start", {
    rclone_path,
    username,
    password,
    endpoint,
    service_name,
  });

  closeForm();
}

function reset_rclone_path() {
  rclone_path = "";
  rclone_path_txt.style.display = "none";
}

IPCRenderer.on("rclone:started", (e, data) => {
  run_rclone_button.innerText = "Stop Rclone";
  run_rclone_button.style.backgroundColor = "red";

  const rows = services_table.rows;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.id === data.service_name) {
      row.cells[2].innerHTML =
        '<i class="fas fa-circle text-blue"></i> running';
    }
  }
});

IPCRenderer.on("rclone:stopped", () => {
  console.log("rclone service stopped.");

  run_rclone_button.innerText = "Run Rclone";
  run_rclone_button.style.backgroundColor = "#4b84fe";

  const rows = services_table.rows;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.id === "Rclone-service") {
      row.cells[2].innerHTML = '<i class="fas fa-circle text-red"></i> stopped';
    }
  }
});

IPCRenderer.on("rclone:check", (event, data) => {
  if (data.status === "running") {
    is_rclone_running = true;
    run_rclone_button.innerText = "Stop Rclone";
    run_rclone_button.style.backgroundColor = "red";
  } else if (data.status === "stopped") {
    is_rclone_running = false;
    run_rclone_button.innerText = "Run Rclone";
    run_rclone_button.style.backgroundColor = "#4b84fe";
  }
  new_service_row(
    "Rclone",
    "rclone command",
    data.status === "running" ? true : false
  );
});

IPCRenderer.on("rclone:created", (event, data) => {
  new_service_row(data.service_name, "rclone mount", false);
});

IPCRenderer.on("error", (event, data) => {
  Toastify.toast({
    text: data.message,
    duration: 5000,
    close: false,
    stopOnFocus: true,
    style: {
      background: "red",
      color: "white",
      textAlign: "center",
      fontSize: "16px",
      padding: "8px",
    },
  });
});

IPCRenderer.on("info", (event, data) => {
  Toastify.toast({
    text: data.message,
    duration: 5000,
    close: false,
    stopOnFocus: true,
    style: {
      background: "green",
      color: "white",
      textAlign: "center",
      fontSize: "16px",
      padding: "8px",
    },
  });
});

IPCRenderer.on("rclone:path", (event, data) => {
  if (data.rclone_path) {
    rclone_path = data.rclone_path;
    rclone_path_txt.innerText = "Using Rclone: " + rclone_path;
    rclone_path_txt.style.display = "block";
  } else {
    console.log("rclone path provided but it's empty");
  }
});
