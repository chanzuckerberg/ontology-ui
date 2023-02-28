module "stack" {
  source              = "git@github.com:chanzuckerberg/happy//terraform/modules/happy-stack-eks?ref=main"
  happy_config_secret = var.happy_config_secret
  image_tag           = var.image_tag
  happymeta_          = var.happymeta_
  image_tags          = jsondecode(var.image_tags)
  stack_name          = var.stack_name
  deployment_stage    = "rdev"
  stack_prefix        = "/${var.stack_name}"
  k8s_namespace       = "jheath-rdev-happy-happy-env"
  services = {
    frontend = {
      name                = "frontend",
      desired_count       = 1,
      port                = 3000,
      memory              = "500Mi"
      cpu                 = "250m"
      health_check_path   = "/",
      service_type        = "INTERNAL"
    },
    backend = {
      name                = "backend",
      desired_count       = 1,
      port                = 5000,
      memory              = "500Mi"
      cpu                 = "250m"
      health_check_path   = "/",
      service_type        = "INTERNAL"
    }
  }
  tasks = {
  }
}
