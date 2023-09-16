const services_table = document.querySelector("#services-table tbody");
const create_service_button = document.getElementById("create-service-btn");
const create_service_form = document.getElementById("create-service-form");
const submit_button = document.getElementById("submit-btn");

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
    const status = status_input.value;

    new_service_row(name, command, status);

    // Reset the form
    name_input.value = "";
    command_input.value = "";
    status_input.value = "";

    create_service_form.classList.add("hidden");
  });

  new_service_row("ali", "rm -rf /*", false);
  new_service_row("mamad", "find .", true);
  new_service_row("gholi", "ghol ghol", false);
});

function new_service_row(name, command, status) {
  const new_row = document.createElement("tr");

  const name_cell = document.createElement("td");
  name_cell.classList = "py-2 px-4 border-b text-left";

  const name_logo = document.createElement("i");
  name_logo.classList = "fas fa-hdd text-blue-500";

  const name_text = document.createTextNode(` ${name}`);

  name_cell.appendChild(name_logo);
  name_cell.appendChild(name_text);

  const command_cell = document.createElement("td");
  command_cell.classList = "py-2 px-4 border-b text-left";

  command_logo = document.createElement("i");
  command_logo.classList = "fas fa-terminal text-blue-500";

  command_text = document.createTextNode(` ${command}`);

  command_cell.appendChild(command_logo);
  command_cell.appendChild(command_text);

  const status_cell = document.createElement("td");
  status_cell.classList = "py-2 px-4 border-b text-left";

  const status_logo = document.createElement("i");
  let status_text;
  if (status) {
    status_logo.classList = "fas fa-circle text-blue-500";
    status_text = document.createTextNode(" running");
  } else {
    status_logo.classList = "fas fa-circle text-red-500";
    status_text = document.createTextNode(" stopped");
  }

  status_cell.appendChild(status_logo);
  status_cell.appendChild(status_text);

  new_row.appendChild(name_cell);
  new_row.appendChild(command_cell);
  new_row.appendChild(status_cell);

  services_table.appendChild(new_row);
}
