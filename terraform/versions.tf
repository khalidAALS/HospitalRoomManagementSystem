terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "HospitalRG"
    storage_account_name = "hospitaltfstate123"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}
