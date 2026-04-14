# Angular build-log-analyzer
Interactive Angular TypeScript build log analyzer with filtering and dashboard


Run the command in your terminal to generate Build Report Dashboard 

# Angular Build Command
ng build --configuration production --named-chunks 2>&1 | tee build.log && node build-report.js && open build-report.html
