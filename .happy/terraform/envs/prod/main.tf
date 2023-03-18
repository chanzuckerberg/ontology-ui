module "stack" {
  source           = "git@github.com:chanzuckerberg/happy//terraform/modules/happy-stack-eks?ref=happy-stack-eks-v4.2.0"
  app_name         = "ontology-ui"
  image_tag        = var.image_tag
  image_tags       = jsondecode(var.image_tags)
  stack_name       = var.stack_name
  deployment_stage = "prod"
  stack_prefix     = "/${var.stack_name}"
  k8s_namespace    = "sc-prod-happy-eks-happy-env"
  services = {
    frontend = {
      name              = "frontend",
      desired_count     = 1,
      port              = 3000,
      memory            = "500Mi"
      cpu               = "250m"
      health_check_path = "/",
      service_type      = "INTERNAL"
    },
    backend = {
      name              = "backend",
      desired_count     = 1,
      port              = 5000,
      memory            = "500Mi"
      cpu               = "250m"
      health_check_path = "/api",
      service_type      = "INTERNAL"
    }
  }
  tasks = {
  }
}
