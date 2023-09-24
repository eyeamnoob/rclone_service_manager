const services_table_body = document.querySelector("#services-table tbody");
const create_service_button = document.getElementById("create-service-btn");
const create_service_form = document.getElementById("create-service-form");
const submit_button = document.getElementById("submit-btn");
const run_rclone_button = document.getElementById("run-rclone-btn");
const services_table = document.getElementById("services-table");
const file_input = document.getElementById("file-input");
let rclone_path = "";

let is_rclone_running = false;

document.addEventListener("DOMContentLoaded", () => {
  create_service_button.addEventListener("click", function () {
    create_service_form.classList.toggle("hidden");
  });

  submit_button.addEventListener("click", function (event) {
    event.preventDefault();

    const name_input = document.getElementById("name");
    const command_input = document.getElementById("command");
    const status_input = document.getElementById("status");

    const name = name_input.value;
    const command = command_input.value;
    const status = status_input.checked;

    new_service_row(name, command, status);

    name_input.value = "";
    command_input.value = "";
    status_input.checked = false;

    create_service_form.classList.add("hidden");
  });
});

function new_service_row(name, command, status) {
  const new_row = document.createElement("tr");

  const name_cell = document.createElement("td");

  // const name_logo = document.createElement("i");

  const name_text = document.createTextNode(` ${name}`);

  // name_cell.appendChild(name_logo);
  name_cell.appendChild(name_text);

  const command_cell = document.createElement("td");

  // command_logo = document.createElement("i");

  command_text = document.createTextNode(` ${command}`);

  // command_cell.appendChild(command_logo);
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

  new_row.id = name + "-service";
  services_table_body.appendChild(new_row);
}

file_input.addEventListener("change", () => {
  rclone_path = file_input.files[0].path;
  IPCRenderer.send("rclone:start", { rclone_path });
});

run_rclone_button.addEventListener("click", function (event) {
  if (is_rclone_running) {
    IPCRenderer.send("rclone:stop", {});
  } else {
    if (rclone_path.length === 0) {
      file_input.click();
    } else {
      IPCRenderer.send("rclone:start", { rclone_path });
    }
  }
  is_rclone_running = !is_rclone_running;
});

IPCRenderer.on("rclone:started", () => {
  console.log("rclone service started.");

  run_rclone_button.innerText = "Stop Rclone";
  run_rclone_button.style.backgroundColor = "red";

  const rows = services_table.rows;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.id === "Rclone-service") {
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
