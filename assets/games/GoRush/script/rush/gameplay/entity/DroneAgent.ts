import { _decorator, Component, Node, Material, Texture2D, Color, math,
    SkeletalAnimation, Animation, AnimationState, AnimationClip, SkinnedMeshRenderer } from 'cc';
import { GorushAgentBase } from './GorushAgentBase';
const { ccclass, property } = _decorator;

const _HANDLENAME_MAINCOLOR_: string = 'mainColor';
const _HANDLENAME_MAINTEXTURE_: string = 'mainTexture';
const _FlyIn_Duration: number = 0.5;

@ccclass('DroneAgent')
export class DroneAgent extends GorushAgentBase {
    @property([SkinnedMeshRenderer])
    skinSuits: SkinnedMeshRenderer[] = []; // TODO

    //treasureData: gorush_pb.TreasureInfo | null = null;
    treasureStartTime: number = 0;
    treasureEndTime: number = 0;

    private animn_standby: string = "drone_standby";
    private animn_result: string = "result";
    private animn_in: string = "drone_in";
    private animn_loop: string = "drone_loop";
    private animn_out: string = "drone_out";
    private animn_eject: string = "eject";
    private animaTreasure: Animation | null = null;
    private treasureMaterials: Material[] = [];
    private treasureColor: Color = new Color(255, 255, 255, 255);
    private flyRateTime: number = 0;
    private currentRate: number = 0;

    get IsFlying(): boolean {
        let name = this.CurrentAnimationName;
        return this.node.active && (name === this.animn_in || name === this.animn_loop);
    }
    get IsEjecting(): boolean {
        return this.CurrentAnimationName === this.animn_eject;
    }
    get HasTreasure(): boolean {
        return false;
    }
    get TreasureOrder(): number {
        return 0;
    }

    protected onLoad() {
        // TODO
        for (let i = 0; i < this.skinSuits.length; i++) {
            this.skinSuits[i].node.active = i === (this.skinSuits.length - 1);
            this.treasureMaterials[i] = this.skinSuits[i].getMaterialInstance(1); // or instancing?
        }
        this.animaTreasure = this.node.getComponent(Animation);
    }
    
    protected onEnable() {
        super.onEnable();
        this.offAnimState = this.skeleton.getState(this.animn_standby);
    }

    setTreasureData(treasure: any, startT: number = 0, endT: number = 0) {
        //this.treasureData = treasure;
        this.treasureStartTime = startT;
        this.treasureEndTime = endT;
        if (treasure) { // TODO
            let level: number = treasure.getTreasureLevel() as number;
            level --;
            for (let i = 0; i < this.skinSuits.length; i++) {
                this.skinSuits[i].node.active = i === level;
            }
            if (this.animaTreasure && level < this.animaTreasure.clips.length && this.animaTreasure.clips[level]) {
                this.animaTreasure.play(this.animaTreasure.clips[level].name);
            }
            this.loadTreasureImage();
        }
        else {
            this.setTreasureImage(null);
            if (this.animaTreasure) {
                this.animaTreasure.stop();
            }
        }
    }

    startLaunch(roundT: number, re: boolean) {
        this.animate(re? this.animn_restart : this.animn_start, 0);
    }

    actRoundStart() {}

    actEject() {
        this.cleanupAnimationEvents();
        this.animate(this.animn_eject, 0.1);
    }

    flyIn(duration: number) {
        let validateEndTime: number = this.treasureStartTime + _FlyIn_Duration;
        if (this.HasTreasure && duration >= validateEndTime) {
            this.cleanupAnimationEvents();
            this.animate(this.animn_loop, 0.1);
            console.log(`[Gorush] ${this.node.name}-${this.node.uuid} flyIn(): fly-loop @rate=${this.currentRate}:t=${this.flyRateTime}`);
            return;
        }
        this.skeleton.once(SkeletalAnimation.EventType.FINISHED, () => {
                if (this && this.isValid && this.CurrentAnimationName === this.animn_in) {
                    console.log(`[Gorush] ${this.node.name}-${this.node.uuid} flyIn() completed @rate=${this.currentRate}:t=${this.flyRateTime} -> fly-loop`);
                    this.animate(this.animn_loop, 0);
                }
            }, this);
        this.animate(this.animn_in, 0);
        this.currentAnimState.wrapMode = AnimationClip.WrapMode.Normal;
        this.currentAnimState.setTime(0);
        this.currentAnimState.sample();
        let targetDuration = Math.max(validateEndTime - duration, 0.1); // minimum delta time = 0.1
        // speed up more purposely
        this.currentAnimState.speed = this.currentAnimState.duration / targetDuration; // arrive earlier
    }

    flyOut() {
        if (this.CurrentAnimationName !== this.animn_out) {
            this.cleanupAnimationEvents();
            this.animate(this.animn_out, 0.05);
        }
        if (this.animaTreasure) {
            this.animaTreasure.stop();
        }
    }

    finalizeWinResult(winner: boolean) {
        if (winner) {
            if (this.HasTreasure) {
                this.treasureColor.a = 255;
                this.refreshTreasureMaterial();
            }
            this.node.active = true;
            this.animate(this.animn_result, 0.1);
        }
        else if (this.node.active && this.HasTreasure && this.IsFlying) {
            this.flyAway();
        }
    }

    flyAway() {
        this.cleanupAnimationEvents();
        this.currentAnimState = this.skeleton.getState(this.animn_in);
        this.currentAnimState.wrapMode = AnimationClip.WrapMode.Reverse;
        this.currentAnimState.speed = 1.66;
        this.animate(this.animn_in, 0.1);
    }

    invalidateData() {
        this.currentRate = 0;
        this.flyRateTime = 0;
        this.setTreasureData(null);
        this.treasureColor.a = 0;
        this.refreshTreasureMaterial();
    }

    refreshSyncFlyInfo(rate: number, currentTime: number) {
        this.currentRate = rate;
        this.flyRateTime = currentTime;
        if (!this.HasTreasure) {
            if (this.treasureColor.a > 0) {
                this.treasureColor.a = 0;
                this.refreshTreasureMaterial();
            }
            return;
        }
        let alpha: number = 0.0;
        if (this.IsFlying || this.IsEjecting) {
            alpha = this.treasureStartTime - currentTime;
            alpha = 1.0 - math.clamp01(alpha);
            alpha *= 255;
        }
        else if (this.treasureEndTime > 0) {
            alpha = 1.0 - math.clamp01(currentTime - this.treasureEndTime);
            alpha *= 255;
        }
        else if (this.treasureColor.a > 0) { // force fade out
            alpha = this.treasureColor.a;
            alpha -= 25;
            alpha = Math.max(0, alpha);
        }
        this.treasureColor.a = alpha;
        this.refreshTreasureMaterial();
    }

    async loadTreasureImage() {
        // if (!this.HasTreasure) {
        //     this.setTreasureImage(null);
        //     return;
        // }
        // let gift = this.treasureData.getGiftItem();
        // if (!gift) {
        //     this.setTreasureImage(null);
        //     return;
        // }
        // let tex: Texture2D = await GorushImageManager.Instance.loadItemTexture(gift.getItemNo());
        // if (tex && tex.isValid) {
        //     this.setTreasureImage(tex);
        // }
    }

    private setTreasureImage(texture: Texture2D | null) {
        for (let i = 0; i < this.skinSuits.length; i++) {
            if (this.treasureMaterials[i]) {
                this.treasureMaterials[i].setProperty(_HANDLENAME_MAINTEXTURE_, texture);
            }
        }
    }

    private refreshTreasureMaterial() {
        // TODO: instancing rendering
        for (let i = 0; i < this.treasureMaterials.length; i++) {
            if (this.skinSuits[i].node.active && this.treasureMaterials[i]) {
                this.treasureMaterials[i].setProperty(_HANDLENAME_MAINCOLOR_, this.treasureColor);
            }
        }
    }
}
