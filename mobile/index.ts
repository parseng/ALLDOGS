import { registerRootComponent } from "expo";

// il compito in background va definito prima di tutto il resto, a livello di modulo
import "./src/location";
import App from "./App";

registerRootComponent(App);
