provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "HospitalRG"
  location = "UK South"
}

resource "azurerm_app_service_plan" "main" {
  name                = "hospital-plan"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  kind                = "Linux"
  reserved            = true

  sku {
    tier = "Basic"
    size = "B1"
  }
}

resource "azurerm_application_insights" "main" {
  name                = "hospitalroommanagement-ai"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"

  lifecycle {
    ignore_changes = [
      workspace_id
    ]
  }
}

resource "azurerm_linux_web_app" "main" {
  name                = "hospitalroommanagement-iac"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_app_service_plan.main.id

  site_config {}

  lifecycle {
    ignore_changes = [
      app_settings["MONGO_URI"],
      app_settings["APPINSIGHTS_INSTRUMENTATIONKEY"],
      app_settings["APPLICATIONINSIGHTS_CONNECTION_STRING"]
    ]
  }

  app_settings = {
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE"         = "false"
    "APPINSIGHTS_INSTRUMENTATIONKEY"              = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"       = azurerm_application_insights.main.connection_string
    "MONGO_URI"                                    = var.mongo_uri
  }
}
