output "service_endpoints" {
  value       = module.stack.service_endpoints
  description = "The URL endpoints for the services"
}

output "k8s_namespace" {
  value = data.kubernetes_namespace.happy-namespace.metadata.0.name
}
