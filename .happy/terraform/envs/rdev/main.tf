module "stack" {
  source              = "git@github.com:chanzuckerberg/happy//terraform/modules/happy-stack-eks?ref=happy-stack-eks-v3.1.0"
  happy_config_secret = var.happy_config_secret
  image_tag           = var.image_tag
  happymeta_          = var.happymeta_
  image_tags          = jsondecode(var.image_tags)
  stack_name          = var.stack_name
  deployment_stage    = "rdev"
  stack_prefix        = "/${var.stack_name}"
  k8s_namespace       = "jheath-rdev-happy-happy-env"
  routing_method      = "CONTEXT"
  services = {
    frontend = {
      name              = "frontend",
      desired_count     = 1,
      port              = 3000,
      memory            = "1G"
      cpu               = "1.0"
      health_check_path = "/",
      service_type      = "EXTERNAL"
      path              = "/*"
    },
    backend = {
      name              = "backend",
      desired_count     = 1,
      port              = 5000,
      memory            = "500Mi"
      cpu               = "250m"
      health_check_path = "/api/health",
      service_type      = "EXTERNAL"
      path              = "/api*"
      priority          = 1
    }
  }
  tasks = {
  }
}
