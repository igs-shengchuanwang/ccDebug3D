import { _decorator, Component, Node, SkeletalAnimation, AnimationState } from 'cc';
import { GorushAgentBase } from './GorushAgentBase';
const { ccclass, property } = _decorator;

@ccclass('LauncherBaseAgent')
export class LauncherBaseAgent extends GorushAgentBase {
    protected onEnable() {
        super.onEnable();
        this.offAnimState = this.skeleton.getState(this.animn_takeoff);
    }
}
