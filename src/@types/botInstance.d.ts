import DisTube from "distube";
import ExtendedClient from "./extendedClient";

export default interface BotInstance {
    name: string;
    client: ExtendedClient;
    distube: DisTube;
}
