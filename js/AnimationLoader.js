// アニメーションローダーユーティリティ
// アニメーションファイルを動的に読み込むためのユーティリティクラス

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MixamoVRMMapper } from './MixamoVRMMapper.js';

// カスタムVRMAnimationLoaderPluginの実装
class VRMAnimationLoaderPlugin {
  constructor(parser) {
    this.parser = parser;
    // GLTFLoaderプラグインには名前が必要
    this.name = 'VRMC_vrm_animation';
  }

  // GLTFParser拡張のコア関数
  async afterRoot(gltf) {
    const json = this.parser.json;

    // 基本的なVRMAのパースロジック
    if (json.extensions && json.extensions.VRMC_vrm_animation) {
      console.log('VRMAファイルを検出しました');
      return {
        animations: gltf.animations || [],
        // 必要に応じてここに他のプロパティを追加
        // メタデータやセットアップ用の情報など
      };
    }
    return null;
  }
}

export class AnimationLoader {
  constructor() {
    this.fbxLoader = new FBXLoader();
    this.gltfLoader = new GLTFLoader();
    
    // VRMAローダーのために、GLTFLoaderにVRMAnimationLoaderPluginを登録
    this.gltfLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    
    // リターゲット用のマッパー
    this.vrmMapper = null;
    this.vrmInstance = null;
    
    // カスタムVRMAのロード警告
    console.info('注：カスタムVRMAローダーを使用しています。完全なVRMAサポートには限界があります。');
  }
  
  /**
   * VRMモデルを設定する
   * @param {Object} vrm - VRMインスタンス
   */
  setVRM(vrm) {
    if (!vrm) {
      console.warn('AnimationLoader: 無効なVRMインスタンスです');
      return;
    }
    
    // 異なるVRMの場合のみ再構築
    if (this.vrmInstance !== vrm) {
      this.vrmInstance = vrm;
      this.vrmMapper = new MixamoVRMMapper(vrm);
      console.log('AnimationLoader: VRMボーンマッパーを初期化しました');
    }
  }
  
  /**
   * アニメーションリストのJSONを読み込む
   * @param {string} path - アニメーションリストJSONのパス
   * @returns {Promise<Array>} - アニメーションの配列
   */
  async loadAnimationsConfig(path) {
    try {
      const response = await fetch(path);
      return await response.json();
    } catch (error) {
      console.error('アニメーションリストの読み込みに失敗しました:', error);
      return [];
    }
  }
  
  /**
   * アニメーションの種類に基づいてローダーを取得
   * @param {string} type - アニメーションタイプ ('fbx' または 'vrma')
   * @returns {Object} - 適切なローダー
   */
  getLoaderByType(type) {
    switch(type.toLowerCase()) {
      case 'fbx':
        return this.fbxLoader;
      case 'vrma':
      case 'gltf':
      case 'glb':
        return this.gltfLoader;
      default:
        console.error(`未知のアニメーション形式: ${type}`);
        return null;
    }
  }
  
  /**
   * アニメーションを読み込む
   * @param {Object} animConfig - アニメーション設定 (type, path)
   * @returns {Promise<Object>} - 読み込まれたアニメーション
   */  loadAnimation(animConfig) {
    return new Promise((resolve, reject) => {
      const loader = this.getLoaderByType(animConfig.type);
      
      if (!loader) {
        reject(new Error(`サポートされていないアニメーション形式: ${animConfig.type}`));
        return;
      }
      
      loader.load(
        animConfig.path,
        (result) => {
          // タイプに応じて異なる処理
          if (animConfig.type.toLowerCase() === 'fbx') {
            // FBXの場合、最初のアニメーションを取得
            let animation = result.animations[0];
            if (animation) {
              // FBXアニメーションをVRMモデル用に最適化
              animation = this.optimizeAnimationForVRM(animation);
              resolve(animation);
            } else {
              reject(new Error(`アニメーションが含まれていません: ${animConfig.path}`));
            }
          } else if (animConfig.type.toLowerCase() === 'vrma') {
            // カスタムVRMAローダーの場合の処理
            console.log('VRMA読み込み結果:', result);
            
            // アニメーションデータを取得
            let animation = null;
            
            // 結果からアニメーションを抽出する様々な方法を試みる
            if (result.animations && result.animations.length > 0) {
              animation = result.animations[0]; 
            } else if (result.userData && result.userData.vrmAnimations) {
              animation = result.userData.vrmAnimations[0];
            } else if (result.animation) {
              animation = result.animation;
            } else {
              // 最後の手段として簡易アニメーションを作成
              console.warn('VRMAからアニメーションを抽出できませんでした。ダミーアニメーションを作成します。');
              animation = new THREE.AnimationClip('dummy', 1, [
                new THREE.NumberKeyframeTrack('.quaternion[0]', [0, 1], [0, 0])
              ]);
            }
            
            resolve(animation);
          } else {
            reject(new Error(`不明なアニメーション形式: ${animConfig.type}`));
          }
        },
        (xhr) => {
          // 進捗状況（必要に応じて）
        },
        (error) => {
          reject(new Error(`アニメーションのロードエラー: ${error}`));
        }
      );
    });
  }
    /**
   * 複数のアニメーションを読み込む
   * @param {Array} animConfigs - アニメーション設定の配列
   * @returns {Promise<Object>} - 読み込まれたアニメーションオブジェクト
   */
  async loadAnimations(animConfigs) {
    const animations = {
      walk: null,
      idle: []
    };
    
    for (const config of animConfigs) {
      try {
        const animation = await this.loadAnimation(config);
        
        // FBXは歩行アニメーション、VRMAはアイドルアニメーションとして扱う
        if (config.type.toLowerCase() === 'fbx') {
          animations.walk = animation;
        } else {
          animations.idle.push(animation);
        }
      } catch (error) {
        console.error(`アニメーション読み込みエラー (${config.path}):`, error);
        // エラーがあっても続行
      }
    }
    
    return animations;
  }  /**
   * キャッシュ機能付きでボーンマッピングを取得
   * @param {Object} vrm - VRMインスタンス
   * @returns {Object} ボーンマッピング
   */
  getBoneMapping(vrm) {
    // キャッシュが有効で、同じVRMインスタンスの場合は再利用
    if (this.boneMappingCache && this.vrmInstanceCache === vrm) {
      console.log('キャッシュされたボーンマッピングを使用します');
      return this.boneMappingCache;
    }

    // 新しいマッピングを生成
    console.log('新しいボーンマッピングを生成します');
    import('./VRMBoneAnalyzer.js').then(({ VRMBoneAnalyzer }) => {
      this.boneMappingCache = VRMBoneAnalyzer.generateAccurateBoneMapping(vrm);
      this.vrmInstanceCache = vrm;
      console.log('ボーンマッピングをキャッシュしました');
    }).catch(error => {
      console.warn('VRMBoneAnalyzerのロードに失敗:', error);
      this.boneMappingCache = this.getFallbackBoneMapping();
    });

    // フォールバックマッピングを一時的に返す
    return this.getFallbackBoneMapping();
  }

  /**
   * フォールバック用のボーンマッピングを取得
   * @returns {Object} フォールバックマッピング
   */
  getFallbackBoneMapping() {
    return {
      // Core bones - VRMで一般的に使われる名前
      'mixamorigHips': 'J_Bip_C_Hips',
      'mixamorigSpine': 'J_Bip_C_Spine',
      'mixamorigSpine1': 'J_Bip_C_Chest', 
      'mixamorigSpine2': 'J_Bip_C_UpperChest',
      'mixamorigNeck': 'J_Bip_C_Neck',
      'mixamorigHead': 'J_Bip_C_Head',
      
      // Left arm
      'mixamorigLeftShoulder': 'J_Bip_L_Shoulder',
      'mixamorigLeftArm': 'J_Bip_L_UpperArm',
      'mixamorigLeftForeArm': 'J_Bip_L_LowerArm',
      'mixamorigLeftHand': 'J_Bip_L_Hand',
      
      // Right arm
      'mixamorigRightShoulder': 'J_Bip_R_Shoulder',
      'mixamorigRightArm': 'J_Bip_R_UpperArm',
      'mixamorigRightForeArm': 'J_Bip_R_LowerArm',
      'mixamorigRightHand': 'J_Bip_R_Hand',
      
      // Left leg
      'mixamorigLeftUpLeg': 'J_Bip_L_UpperLeg',
      'mixamorigLeftLeg': 'J_Bip_L_LowerLeg',
      'mixamorigLeftFoot': 'J_Bip_L_Foot',
      'mixamorigLeftToeBase': 'J_Bip_L_ToeBase',
      
      // Right leg
      'mixamorigRightUpLeg': 'J_Bip_R_UpperLeg',
      'mixamorigRightLeg': 'J_Bip_R_LowerLeg',
      'mixamorigRightFoot': 'J_Bip_R_Foot',
      'mixamorigRightToeBase': 'J_Bip_R_ToeBase',

      // Left hand fingers
      'mixamorigLeftHandThumb1': 'J_Bip_L_Thumb1',
      'mixamorigLeftHandThumb2': 'J_Bip_L_Thumb2',
      'mixamorigLeftHandThumb3': 'J_Bip_L_Thumb3',
      'mixamorigLeftHandIndex1': 'J_Bip_L_Index1',
      'mixamorigLeftHandIndex2': 'J_Bip_L_Index2',
      'mixamorigLeftHandIndex3': 'J_Bip_L_Index3',
      'mixamorigLeftHandMiddle1': 'J_Bip_L_Middle1',
      'mixamorigLeftHandMiddle2': 'J_Bip_L_Middle2',
      'mixamorigLeftHandMiddle3': 'J_Bip_L_Middle3',
      'mixamorigLeftHandRing1': 'J_Bip_L_Ring1',
      'mixamorigLeftHandRing2': 'J_Bip_L_Ring2',
      'mixamorigLeftHandRing3': 'J_Bip_L_Ring3',
      'mixamorigLeftHandPinky1': 'J_Bip_L_Little1',
      'mixamorigLeftHandPinky2': 'J_Bip_L_Little2',
      'mixamorigLeftHandPinky3': 'J_Bip_L_Little3',
      
      // Right hand fingers
      'mixamorigRightHandThumb1': 'J_Bip_R_Thumb1',
      'mixamorigRightHandThumb2': 'J_Bip_R_Thumb2',
      'mixamorigRightHandThumb3': 'J_Bip_R_Thumb3',
      'mixamorigRightHandIndex1': 'J_Bip_R_Index1',
      'mixamorigRightHandIndex2': 'J_Bip_R_Index2',
      'mixamorigRightHandIndex3': 'J_Bip_R_Index3',
      'mixamorigRightHandMiddle1': 'J_Bip_R_Middle1',
      'mixamorigRightHandMiddle2': 'J_Bip_R_Middle2',
      'mixamorigRightHandMiddle3': 'J_Bip_R_Middle3',
      'mixamorigRightHandRing1': 'J_Bip_R_Ring1',
      'mixamorigRightHandRing2': 'J_Bip_R_Ring2',
      'mixamorigRightHandRing3': 'J_Bip_R_Ring3',
      'mixamorigRightHandPinky1': 'J_Bip_R_Little1',
      'mixamorigRightHandPinky2': 'J_Bip_R_Little2',
      'mixamorigRightHandPinky3': 'J_Bip_R_Little3'
    };
  }
  /**
   * FBXアニメーションをVRMモデル向けに最適化する
   * @param {THREE.AnimationClip} animation - 最適化するアニメーション
   * @returns {THREE.AnimationClip} - 最適化されたアニメーション
   */
  optimizeAnimationForVRM(animation) {
    // VRMインスタンスが利用できない場合はエラー
    if (!this.vrmInstance) {
      console.warn('optimizeAnimationForVRM: VRMインスタンスが設定されていません');
      return animation;
    }
    
    // MixamoVRMMapperを使ってアニメーションをリターゲット
    if (!this.vrmMapper) {
      console.log('新しいMixamoVRMMapperを初期化します');
      this.vrmMapper = new MixamoVRMMapper(this.vrmInstance);
    }
    
    // アニメーションを検証
    const validationResult = this.vrmMapper.validateClip(animation);
    console.log(`アニメーション検証結果:`, validationResult);
    
    // アニメーション名にリターゲット済みという接尾辞をつける
    const retargetedAnimation = this.vrmMapper.retargetAnimation(
      animation, 
      `${animation.name}_retargeted`
    );
    
    // 統計情報の出力
    console.info(`アニメーション「${animation.name}」をVRM用にリターゲット完了:`);
    console.info(`- 元のトラック数: ${animation.tracks.length}`);
    console.info(`- リターゲット後のトラック数: ${retargetedAnimation.tracks.length}`);
    
    return retargetedAnimation;
  }

  /**
   * Hip回転の調整（MixamoからVRMへの座標系変換）
   * @param {THREE.KeyframeTrack} track - 調整するトラック
   */
  adjustHipRotation(track) {
    // Y軸180度回転のクォータニオン
    const yRotation180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    
    // 各キーフレームの回転を調整
    for (let i = 0; i < track.values.length; i += 4) {
      const originalQuat = new THREE.Quaternion(
        track.values[i],     // x
        track.values[i + 1], // y
        track.values[i + 2], // z
        track.values[i + 3]  // w
      );
      
      // Y軸180度回転を適用
      const adjustedQuat = originalQuat.multiply(yRotation180);
      
      track.values[i] = adjustedQuat.x;
      track.values[i + 1] = adjustedQuat.y;
      track.values[i + 2] = adjustedQuat.z;
      track.values[i + 3] = adjustedQuat.w;
    }
  }

  /**
   * VRMボーン構造の検証とフォールバック
   * @param {Object} vrm - VRMインスタンス
   * @param {Array} tracks - アニメーショントラック
   * @returns {Array} - 検証済みトラック
   */
  validateBonesAndCreateFallback(vrm, tracks) {
    if (!vrm || !vrm.humanoid) {
      console.warn('VRM humanoidが利用できません。基本的なトラックを使用します。');
      return tracks;
    }
    
    const validatedTracks = [];
    const humanoidBones = vrm.humanoid.humanBones;
    
    for (const track of tracks) {
      const boneName = track.name.split('.')[0];
      
      // VRMのhumanoidボーン構造で検証
      if (humanoidBones[boneName]) {
        validatedTracks.push(track);
      } else {
        console.warn(`VRMモデルにボーン「${boneName}」が見つかりません`);
      }
    }
    
    return validatedTracks;
  }

  async loadAnimations(animConfigs) {
    const animations = {
      walk: null,
      idle: []
    };
    
    for (const config of animConfigs) {
      try {
        const animation = await this.loadAnimation(config);
        
        // FBXは歩行アニメーション、VRMAはアイドルアニメーションとして扱う
        if (config.type.toLowerCase() === 'fbx') {
          animations.walk = animation;
        } else {
          animations.idle.push(animation);
        }
      } catch (error) {
        console.error(`アニメーション読み込みエラー (${config.path}):`, error);
        // エラーがあっても続行
      }
    }
    
    return animations;
  }
}
